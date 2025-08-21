import type { Route } from "./+types/attendance.$id";
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";

type AttendanceRecord = {
  UserID: string;
  Timestamp: string;
  WorkplaceID: string;
  Action: "check_in" | "check_out";
};

type UserAttendanceDetail = {
  UserID: string;
  WorkplaceID: string;
  Records: AttendanceRecord[];
  TotalWorkingHours: number;
  CheckInTime?: string;
  CheckOutTime?: string;
};

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `出勤記録詳細 - ${params.id} - 勤怠管理システム` },
    { name: "description", content: "ユーザーの出勤記録詳細情報" },
  ];
}

export default function AttendanceDetail() {
  const { id } = useParams();
  const [userDetail, setUserDetail] = useState<UserAttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchUserAttendanceDetail();
  }, [id, selectedDate]);

  const fetchUserAttendanceDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      const params = new URLSearchParams({ id, date: selectedDate });
      const response = await fetch(`${apiBaseUrl}/api/v1/attendance/detail?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as any;
      if (data.success && data.attendance_detail) {
        setUserDetail(data.attendance_detail);
      } else {
        setUserDetail(null);
      }
    } catch (error) {
      console.error("Failed to fetch user attendance detail:", error);
      setUserDetail(null);
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
      ? "bg-green-100 text-green-800 border-green-200" 
      : "bg-red-100 text-red-800 border-red-200";
  };

  const formatWorkingHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">読み込み中...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">データが見つかりません</h3>
            <p className="text-gray-500 mb-4">指定されたユーザーの出勤記録が見つかりませんでした。</p>
            <Link
              to="/attendance"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              出勤記録一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/attendance"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            出勤記録一覧に戻る
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">出勤記録詳細</h1>
          <p className="text-gray-600">ユーザー: {userDetail.UserID}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">本日の勤務状況</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">出勤時刻:</span>
                <span className="font-medium text-gray-900">
                  {userDetail.CheckInTime ? formatTime(userDetail.CheckInTime) : "未出勤"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">退勤時刻:</span>
                <span className="font-medium text-gray-900">
                  {userDetail.CheckOutTime ? formatTime(userDetail.CheckOutTime) : "未退勤"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-gray-600">総勤務時間:</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatWorkingHours(userDetail.TotalWorkingHours)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">勤務地情報</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">勤務地ID:</span>
                <span className="font-medium text-gray-900">{userDetail.WorkplaceID}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">記録数:</span>
                <span className="font-medium text-gray-900">{userDetail.Records.length}件</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">日付:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">タイムライン</h2>
          </div>
          <div className="p-6">
            {userDetail.Records.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">記録がありません</h3>
                <p className="text-gray-500">選択した日付の記録は見つかりませんでした。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userDetail.Records.map((record, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${record.Action === 'check_in' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(record.Timestamp)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(record.Timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getActionColor(record.Action)}`}>
                            {getActionText(record.Action)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {record.WorkplaceID}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
                <p>現在はモックデータを表示しています。実際のAPIエンドポイントと接続後、リアルタイムのユーザー別出勤記録が表示されます。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}