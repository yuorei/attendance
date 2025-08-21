import type { Route } from "./+types/attendance";
import { useState, useEffect } from "react";
import { Link } from "react-router";

type AttendanceRecord = {
  UserID: string;
  Timestamp: string;
  WorkplaceID: string;
  Action: "check_in" | "check_out";
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "出勤記録 - 勤怠管理システム" },
    { name: "description", content: "Slack勤怠管理システムの出勤記録一覧" },
  ];
}

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedDate]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      // Format date as YYYYMM for the API
      const yearMonth = selectedDate.replace("-", "").substring(0, 6);
      
      // API endpoint for getting monthly attendance records
      // Note: These parameters would normally come from user authentication
      const params = new URLSearchParams({
        team_id: "EXAMPLE_TEAM",
        channel_id: "EXAMPLE_CHANNEL", 
        user_id: "EXAMPLE_USER",
        year_month: yearMonth
      });
      
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBaseUrl}/api/v1/attendance/monthly?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (data.success && data.attendance_logs) {
        // Convert backend format to frontend format
        const convertedRecords: AttendanceRecord[] = data.attendance_logs.map((log: any) => ({
          UserID: log.UserID,
          Timestamp: log.Timestamp,
          WorkplaceID: log.WorkplaceID,
          Action: log.Action === "start" ? "check_in" : "check_out"
        }));
        setRecords(convertedRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
      // Fallback to empty array on error
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("ja-JP");
  };

  const getActionText = (action: string) => {
    return action === "check_in" ? "出勤" : "退勤";
  };

  const getActionColor = (action: string) => {
    return action === "check_in" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">出勤記録</h1>
          <p className="text-gray-600">Slack勤怠管理システム</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">出勤記録一覧</h2>
              <div className="flex flex-col sm:flex-row gap-4">
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
                <button
                  onClick={fetchAttendanceRecords}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
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

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">お知らせ</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>バックエンドAPIと接続されています。実際の勤怠データを表示するには、適切なteam_id、channel_id、user_idを設定してください。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}