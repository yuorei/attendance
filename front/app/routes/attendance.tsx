import type { Route } from "./+types/attendance";
import { useState, useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import ChannelSelector from "../components/ChannelSelector";
import AttendanceActions from "../components/AttendanceActions";

type AttendanceRecord = {
  UserID: string;
  Timestamp: string;
  WorkplaceID: string;
  Action: "check_in" | "check_out";
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
  return {
    apiUrl: context.cloudflare.env.VITE_API_URL || "",
  };
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
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

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
  }, [selectedDate, user, authChecked, selectedChannel]);

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
      const yearMonth = selectedDate.replace("-", "").substring(0, 6);
      
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
              <div className="flex items-center gap-2">
                <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
                  日付:
                </label>
                <input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {records.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">記録がありません</h3>
                <p className="text-gray-500">選択した日付の出勤記録は見つかりませんでした。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザーID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        時刻
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        勤務地
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            to={`/attendance/${record.UserID}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {record.UserID}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(record.Timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(record.Timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.WorkplaceID}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(record.Action)}`}>
                            {getActionText(record.Action)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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