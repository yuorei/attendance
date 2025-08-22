import type { Route } from "./+types/login";
import { useState } from "react";
import { useLoaderData } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  return {
    apiUrl: context.cloudflare.env.VITE_API_URL || "https://yuorei.com",
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ログイン - 勤怠管理システム" },
    { name: "description", content: "Slackアカウントでログイン" },
  ];
}

interface SlackUser {
  user_id: string;
  team_id: string;
  team_name: string;
  user_name: string;
  scope: string;
}

export default function Login() {
  const { apiUrl } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SlackUser | null>(null);

  const handleSlackLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/auth/slack`);
      if (!response.ok) {
        throw new Error("ログイン開始に失敗しました");
      }

      const data = (await response.json()) as { auth_url?: unknown };
      if (data && typeof data.auth_url === "string") {
        window.location.href = data.auth_url;
      } else {
        throw new Error("認証URLの取得に失敗しました");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "ログインに失敗しました");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("slack_session");
    setUser(null);
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン成功</h1>
              <p className="text-gray-600">Slackアカウントでログインしました</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-gray-900 mb-2">アカウント情報</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">ユーザー名:</span> {user.user_name}</p>
                <p><span className="font-medium">チーム:</span> {user.team_name}</p>
                <p><span className="font-medium">User ID:</span> {user.user_id}</p>
                <p><span className="font-medium">Team ID:</span> {user.team_id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="/attendance"
                className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                出勤記録を確認
              </a>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 transition-all duration-200"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-600 rounded-lg p-1 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
            <p className="text-gray-600">勤怠管理システムにアクセスするためにSlackアカウントでログインしてください</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSlackLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                <span className="text-gray-700 font-semibold">ログイン中...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523c0-1.395 1.13-2.525 2.52-2.525s2.523 1.13 2.523 2.525A2.528 2.528 0 0 1 5.042 15.165z" fill="#E01E5A"/>
                  <path d="M5.042 12.642c0-.668.54-1.21 1.21-1.21h3.897c1.458 0 2.64-1.18 2.64-2.637V5.042c0-1.392 1.13-2.52 2.523-2.52a2.528 2.528 0 0 1 2.52 2.52c0 1.393-1.13 2.523-2.52 2.523z" fill="#36C5F0"/>
                  <path d="M8.685 18.915c0-.668-.54-1.21-1.21-1.21H5.042c-1.458 0-2.64 1.18-2.64 2.637v3.753c0 1.392 1.13 2.52 2.523 2.52a2.528 2.528 0 0 1 2.52-2.52c0-1.393-1.13-2.523-2.52-2.523z" fill="#2EB67D"/>
                  <path d="M18.958 8.835a2.528 2.528 0 0 1 2.52 2.523c0 1.395-1.13 2.525-2.52 2.525s-2.523-1.13-2.523-2.525A2.528 2.528 0 0 1 18.958 8.835z" fill="#ECB22E"/>
                </svg>
                <span className="text-gray-700 font-semibold">Slackでログイン</span>
              </div>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              ログインすることで、サービス利用規約とプライバシーポリシーに同意したものとみなされます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}