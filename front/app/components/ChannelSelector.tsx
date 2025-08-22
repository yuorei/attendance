import { useState, useEffect } from "react";

interface Channel {
  id: string;
  name: string;
  is_group?: boolean;
  is_member?: boolean;
}

interface ChannelSelectorProps {
  accessToken: string;
  selectedChannel?: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  apiUrl: string;
  className?: string;
}

export default function ChannelSelector({
  accessToken,
  selectedChannel,
  onChannelSelect,
  apiUrl,
  className = ""
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [accessToken]);

  const fetchChannels = async () => {
    console.log('fetchChannels called with accessToken:', accessToken);
    if (!accessToken) {
      console.log('No access token, returning early');
      return;
    }

    console.log('Starting to fetch channels...');
    setLoading(true);
    setError(null);

    try {
      const apiBaseUrl = apiUrl;
      const requestUrl = `${apiBaseUrl}/api/v1/slack/channels?access_token=${encodeURIComponent(accessToken)}`;
      console.log('Fetching channels from:', requestUrl);
      
      const response = await fetch(requestUrl);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      type ChannelsResponse = {
        success?: boolean;
        channels?: Channel[];
        message?: string;
      };

      const data = (await response.json()) as ChannelsResponse;
      console.log('Channels response data:', data);

      if (data.success && data.channels) {
        setChannels(data.channels);
        // デフォルトでgeneralチャンネルを選択
        const generalChannel = data.channels.find((ch: Channel) => ch.name === "general");
        if (generalChannel && !selectedChannel) {
          onChannelSelect(generalChannel);
        }
      } else {
        throw new Error(data?.message || "チャンネル一覧の取得に失敗しました");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "チャンネル一覧の取得に失敗しました");
      console.error("Failed to fetch channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    onChannelSelect(channel);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        チャンネル選択
      </label>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-left shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {selectedChannel ? (
                <>
                  <span className="text-gray-600 mr-2">#</span>
                  <span>{selectedChannel.name}</span>
                </>
              ) : (
                <span className="text-gray-400">チャンネルを選択してください</span>
              )}
            </div>
            <div className="flex items-center">
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              )}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {error ? (
              <div className="p-3 text-red-600 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
                <button
                  onClick={fetchChannels}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  再試行
                </button>
              </div>
            ) : channels.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">
                アクセス可能なチャンネルがありません
              </div>
            ) : (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    selectedChannel?.id === channel.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">#</span>
                    <span className="font-medium">{channel.name}</span>
                    {selectedChannel?.id === channel.id && (
                      <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* クリック外側で閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}