import { useState } from "react";

interface Channel {
  id: string;
  name: string;
  is_group?: boolean;
  is_member?: boolean;
}

interface SlackUser {
  user_id: string;
  team_id: string;
  team_name: string;
  user_name: string;
  scope: string;
  access_token: string;
}

interface AttendanceActionsProps {
  user: SlackUser;
  selectedChannel: Channel | null;
  onActionComplete: () => void;
  apiUrl: string;
  className?: string;
}

export default function AttendanceActions({
  user,
  selectedChannel,
  onActionComplete,
  apiUrl,
  className = ""
}: AttendanceActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAction = async (action: 'check-in' | 'check-out') => {
    if (!selectedChannel) {
      setMessage("チャンネルを選択してください");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(action);
    setMessage(null);

    try {
      const apiBaseUrl = apiUrl;
      const endpoint = action === 'check-in' ? '/api/v1/attendance/check-in' : '/api/v1/attendance/check-out';
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: user.team_id,
          channel_id: selectedChannel.id,
          user_id: user.user_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        onActionComplete();
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ ${action === 'check-in' ? '出勤' : '退勤'}記録に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">勤怠アクション</h3>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.startsWith('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {!selectedChannel && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm">
          ⚠️ チャンネルを選択してから勤怠記録を行ってください
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleAction('check-in')}
          disabled={!selectedChannel || loading === 'check-in'}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'check-in' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              処理中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
              出勤
            </>
          )}
        </button>

        <button
          onClick={() => handleAction('check-out')}
          disabled={!selectedChannel || loading === 'check-out'}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'check-out' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              処理中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退勤
            </>
          )}
        </button>
      </div>

      {selectedChannel && (
        <p className="mt-3 text-sm text-gray-500">
          記録先: #{selectedChannel.name}
        </p>
      )}
    </div>
  );
}