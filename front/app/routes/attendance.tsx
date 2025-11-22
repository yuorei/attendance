import type { Route } from "./+types/attendance";
import { useState, useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import ChannelSelector from "../components/ChannelSelector";
import AttendanceActions from "../components/AttendanceActions";

type AttendanceRecord = {
  ID: string;
  UserID: string;
  Timestamp: string;
  WorkplaceID: string;
  Action: "check_in" | "check_out";
};

type DailyWorkSummary = {
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours: number;
  records: AttendanceRecord[];
};

type SlackUser = {
  user_id: string;
  team_id: string;
  team_name: string;
  user_name: string;
  scope: string;
  access_token: string;
};

type Channel = {
  id: string;
  name: string;
  is_group?: boolean;
  is_member?: boolean;
};

export async function loader({ context }: Route.LoaderArgs) {
  const apiUrl = context.cloudflare.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Response("VITE_API_URL is not configured", { status: 500 });
  }
  return { apiUrl };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "出勤記録 - 勤怠管理システム" },
    { name: "description", content: "Slack勤怠管理システムの出勤記録一覧" },
  ];
}

export default function Attendance() {
  const { apiUrl } = useLoaderData<typeof loader>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SlackUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedDateDetail, setSelectedDateDetail] = useState<Date | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const sessionData = localStorage.getItem('slack_session');
      if (sessionData) {
        try {
          const userData = JSON.parse(sessionData);
          setUser(userData);
          // 保存されたチャンネル選択を復元
          if (userData.selected_channel) {
            setSelectedChannel(userData.selected_channel);
          }
        } catch (error) {
          console.error('Failed to parse session data:', error);
          localStorage.removeItem('slack_session');
        }
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (user && authChecked && selectedChannel) {
      fetchAttendanceRecords();
    }
  }, [selectedMonth, user, authChecked, selectedChannel]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    // チャンネル情報をセッションに保存
    const sessionData = localStorage.getItem('slack_session');
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        userData.selected_channel = channel;
        localStorage.setItem('slack_session', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to save channel selection:', error);
      }
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!user || !selectedChannel) return;
    
    setLoading(true);
    try {
      // Format date as YYYYMM for the API
      const yearMonth = selectedMonth.replace("-", "");
      
      // Use authenticated user's data with selected channel
      const params = new URLSearchParams({
        team_id: user.team_id,
        channel_id: selectedChannel.id,
        user_id: user.user_id,
        year_month: yearMonth
      });
      
      const apiBaseUrl = apiUrl;
      const response = await fetch(`${apiBaseUrl}/api/v1/attendance/monthly?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      if (data.success && data.attendance_logs) {
        // Convert backend format to frontend format
        const convertedRecords: AttendanceRecord[] = data.attendance_logs.map((log: any, index: number) => {
          return {
            ID: log.ID || `${log.UserID}-${log.Timestamp}-${index}`, // Generate ID if not provided
            UserID: log.UserID,
            Timestamp: log.Timestamp,
            WorkplaceID: log.WorkplaceID,
            Action: log.Action === "start" ? "check_in" : "check_out"
          };
        });
        setRecords(convertedRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const parseGoTimestamp = (timestamp: string): Date | null => {
    try {
      // timestampが空文字列やnullの場合
      if (!timestamp || timestamp === "" || timestamp === "undefined" || timestamp === "null") {
        return null;
      }
      
      // Go time.Time の様々な形式に対応:
      // "2025-08-07 15:08:33.414108928 +0900 JST"
      // "2025-08-07T15:08:33Z" (ISO 8601)
      // "2025-08-07T15:08:33+09:00"
      
      // まずISO 8601形式を試す
      let date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Go time.Time のカスタム形式をパース
      // ナノ秒精度と末尾のタイムゾーン名を除去
      let cleanTimestamp = timestamp
        .replace(/\.\d+/, "") // ナノ秒を除去
        .replace(/ [A-Z]{3,4}$/, ""); // 末尾のタイムゾーン名 (JST, UTC等) を除去
      
      
      // タイムゾーンオフセット形式を修正: +0900 -> +09:00
      cleanTimestamp = cleanTimestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
      
      // スペースをTに置換してISO 8601形式にする
      // 日付と時刻の間のスペース、時刻とタイムゾーンの間のスペースを処理
      cleanTimestamp = cleanTimestamp.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (.+)$/, "$1T$2$3");
      
      
      date = new Date(cleanTimestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      return null;
    } catch (error) {
      console.error("Failed to parse timestamp:", timestamp, error);
      return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = parseGoTimestamp(timestamp);
    
    if (!date) {
      return "Invalid Time";
    }
    
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo"
    });
  };

  const formatDate = (timestamp: string) => {
    const date = parseGoTimestamp(timestamp);
    
    if (!date) {
      return "Invalid Date";
    }
    
    return date.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo"
    });
  };

  const getActionText = (action: string) => {
    return action === "check_in" ? "出勤" : "退勤";
  };

  const getActionColor = (action: string) => {
    return action === "check_in" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  // Group records by date and calculate working hours
  const getDailyWorkSummaries = (records: AttendanceRecord[]): DailyWorkSummary[] => {
    const dailyGroups: { [date: string]: AttendanceRecord[] } = {};
    
    records.forEach(record => {
      const date = formatDate(record.Timestamp);
      if (!dailyGroups[date]) {
        dailyGroups[date] = [];
      }
      dailyGroups[date].push(record);
    });

    return Object.entries(dailyGroups).map(([date, dayRecords]) => {
      const sortedRecords = dayRecords.sort((a, b) => 
        new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
      );
      
      const checkIn = sortedRecords.find(r => r.Action === 'check_in');
      const checkOut = sortedRecords.find(r => r.Action === 'check_out');
      
      let workingHours = 0;
      if (checkIn && checkOut) {
        const inTime = parseGoTimestamp(checkIn.Timestamp);
        const outTime = parseGoTimestamp(checkOut.Timestamp);
        if (inTime && outTime) {
          workingHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
        }
      }
      
      return {
        date,
        checkIn: checkIn?.Timestamp,
        checkOut: checkOut?.Timestamp,
        workingHours,
        records: sortedRecords
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatWorkingHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getWorkingHoursBarWidth = (hours: number, maxHours: number): number => {
    return maxHours > 0 ? (hours / maxHours) * 100 : 0;
  };


  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Sunday
    
    const days: Date[] = [];
    
    // Add previous month's days to fill the first week
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = new Date(year, month, -i);
      days.push(prevDay);
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add next month's days to fill the last week
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  const formatDateKey = (date: Date): string => {
    return date.toLocaleDateString("ja-JP");
  };

  // Get work summaries first
  const workSummaries = getDailyWorkSummaries(records);
  const maxWorkingHours = Math.max(...workSummaries.map(s => s.workingHours), 8); // Minimum 8 hours for scale

  const getWorkSummaryForDate = (date: Date): DailyWorkSummary | null => {
    const dateKey = formatDateKey(date);
    return workSummaries.find(summary => summary.date === dateKey) || null;
  };

  const getColorIntensity = (workingHours: number): string => {
    if (workingHours === 0) return "bg-gray-100";
    if (workingHours < 2) return "bg-blue-100";
    if (workingHours < 4) return "bg-blue-200";
    if (workingHours < 6) return "bg-blue-300";
    if (workingHours < 8) return "bg-blue-400";
    if (workingHours < 10) return "bg-blue-500";
    return "bg-blue-600";
  };

  const getTextColor = (workingHours: number): string => {
    if (workingHours < 4) return "text-gray-700";
    return "text-white";
  };

  const handleDateClick = (date: Date, workSummary: DailyWorkSummary | null) => {
    if (!workSummary || workSummary.workingHours === 0) return;
    setSelectedDateDetail(date);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDateDetail(null);
  };

  const selectedDateSummary = selectedDateDetail ? getWorkSummaryForDate(selectedDateDetail) : null;

  const currentMonth = new Date(selectedMonth + "-01");
  const calendarDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const handleLogout = () => {
    localStorage.removeItem('slack_session');
    window.location.href = '/login';
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">認証確認中...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">出勤記録を確認するにはSlackアカウントでログインしてください</p>
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
            >
              ログインページへ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">出勤記録</h1>
              <p className="text-gray-600">ようこそ、{user.user_name}さん ({user.team_name})</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">出勤記録一覧</h2>
            
            {/* チャンネル選択 */}
            <div className="mb-4">
              <ChannelSelector
                accessToken={user.access_token}
                selectedChannel={selectedChannel}
                onChannelSelect={handleChannelSelect}
                apiUrl={apiUrl}
                className="max-w-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="month-filter" className="text-sm font-medium text-gray-700">
                    月:
                  </label>
                  <input
                    id="month-filter"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  カレンダーで勤務時間を視覚化
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchAttendanceRecords}
                  disabled={!selectedChannel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 勤怠アクション */}
        <AttendanceActions
          user={user}
          selectedChannel={selectedChannel}
          onActionComplete={fetchAttendanceRecords}
          apiUrl={apiUrl}
          className="mb-6"
        />

        {!selectedChannel ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">チャンネルを選択してください</h3>
              <p className="text-gray-500">出勤記録を表示するためにSlackチャンネルを選択してください。</p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">読み込み中...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Calendar View */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })} 勤怠カレンダー
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">色の濃さで労働時間を表示</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const prevMonth = new Date(currentMonth);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setSelectedMonth(prevMonth.toISOString().slice(0, 7));
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const nextMonth = new Date(currentMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setSelectedMonth(nextMonth.toISOString().slice(0, 7));
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const workSummary = getWorkSummaryForDate(date);
                    const workingHours = workSummary?.workingHours || 0;
                    const colorClass = getColorIntensity(workingHours);
                    const textColorClass = getTextColor(workingHours);
                    
                    return (
                      <div
                        key={index}
                        className={`
                          relative p-3 h-24 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200
                          ${isCurrentMonth ? 'hover:shadow-md hover:scale-105' : 'opacity-50'}
                          ${isToday ? 'ring-2 ring-blue-500' : ''}
                          ${colorClass}
                          ${workSummary && workingHours > 0 ? 'hover:ring-2 hover:ring-blue-300' : ''}
                          group
                        `}
                        title={workSummary ? 
                          `${formatDateKey(date)}\n勤務時間: ${formatWorkingHours(workingHours)}\n出勤: ${workSummary.checkIn ? formatTime(workSummary.checkIn) : '-'}\n退勤: ${workSummary.checkOut ? formatTime(workSummary.checkOut) : '-'}\nクリックで詳細表示` :
                          `${formatDateKey(date)}\n勤務記録なし`
                        }
                        onClick={() => handleDateClick(date, workSummary)}
                      >
                        {/* Date Number */}
                        <div className={`text-lg font-semibold ${textColorClass} ${isCurrentMonth ? '' : 'text-gray-400'}`}>
                          {date.getDate()}
                        </div>
                        
                        {/* Working Hours */}
                        {workSummary && workingHours > 0 && (
                          <div className={`text-xs font-medium ${textColorClass} mt-1`}>
                            {formatWorkingHours(workingHours)}
                          </div>
                        )}
                        
                        {/* Click indicator for days with records */}
                        {workSummary && workingHours > 0 && (
                          <div className={`absolute bottom-1 right-1 text-xs ${textColorClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            📋
                          </div>
                        )}
                        
                        {/* Today Indicator */}
                        {isToday && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        
                        {/* Hover Details */}
                        {workSummary && (
                          <div className="absolute inset-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                            <div className="font-semibold">{formatDateKey(date)}</div>
                            <div>出勤: {workSummary.checkIn ? formatTime(workSummary.checkIn) : '-'}</div>
                            <div>退勤: {workSummary.checkOut ? formatTime(workSummary.checkOut) : '-'}</div>
                            <div className="font-semibold text-yellow-300">
                              {formatWorkingHours(workingHours)}
                            </div>
                            <div className="text-gray-300">{workSummary.records.length}件の記録</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">勤務時間の色分け</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                      <span>0h</span>
                      <div className="w-4 h-4 bg-blue-100 border border-gray-300 rounded"></div>
                      <span>2h</span>
                      <div className="w-4 h-4 bg-blue-300 border border-gray-300 rounded"></div>
                      <span>6h</span>
                      <div className="w-4 h-4 bg-blue-500 border border-gray-300 rounded"></div>
                      <span>8h</span>
                      <div className="w-4 h-4 bg-blue-600 border border-gray-300 rounded"></div>
                      <span>10h+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Date Detail Modal */}
            {showDetailModal && selectedDateDetail && selectedDateSummary && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {formatDateKey(selectedDateDetail)} の勤務詳細
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        総勤務時間: {formatWorkingHours(selectedDateSummary.workingHours)}
                      </p>
                    </div>
                    <button
                      onClick={closeDetailModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-full">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="font-semibold text-green-800">出勤時刻</h3>
                            <p className="text-lg font-bold text-green-700">
                              {selectedDateSummary.checkIn ? formatTime(selectedDateSummary.checkIn) : '未記録'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-red-100 rounded-full">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="font-semibold text-red-800">退勤時刻</h3>
                            <p className="text-lg font-bold text-red-700">
                              {selectedDateSummary.checkOut ? formatTime(selectedDateSummary.checkOut) : '未記録'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Working Hours Visualization */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-3">勤務時間の詳細</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-700">総勤務時間</span>
                        <span className="text-lg font-bold text-blue-800">
                          {formatWorkingHours(selectedDateSummary.workingHours)}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-4 mb-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((selectedDateSummary.workingHours / 12) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>0時間</span>
                        <span>6時間</span>
                        <span>12時間</span>
                      </div>
                    </div>
                    
                    {/* Records Timeline */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-4">記録タイムライン</h3>
                      <div className="space-y-3">
                        {selectedDateSummary.records
                          .sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime())
                          .map((record, index) => (
                          <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${record.Action === 'check_in' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getActionColor(record.Action)}`}>
                                    {getActionText(record.Action)}
                                  </span>
                                  <span className="ml-3 text-lg font-semibold text-gray-900">
                                    {formatTime(record.Timestamp)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600 font-mono">
                                    記録ID: {record.ID}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    勤務地: {record.WorkplaceID}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {selectedDateSummary.records.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2">この日の記録は見つかりませんでした</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
                    <button
                      onClick={closeDetailModal}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Monthly Statistics */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">総勤務時間</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatWorkingHours(workSummaries.reduce((total, summary) => total + summary.workingHours, 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">出勤日数</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {workSummaries.filter(summary => summary.workingHours > 0).length}日
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">平均勤務時間</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {workSummaries.length > 0 ? formatWorkingHours(
                        workSummaries.reduce((total, summary) => total + summary.workingHours, 0) / 
                        workSummaries.filter(summary => summary.workingHours > 0).length || 0
                      ) : '0h 0m'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">認証済み</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Slackアカウント ({user.user_name}) で認証済みです。あなたの勤怠記録を表示しています。</p>
                {selectedChannel && (
                  <p className="text-sm text-green-600 mb-2">現在のチャンネル: #{selectedChannel.name}</p>
                )}
                <p className="mt-1 text-xs text-green-600">Team ID: {user.team_id} | User ID: {user.user_id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
