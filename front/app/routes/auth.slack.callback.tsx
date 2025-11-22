import type { Route } from "./+types/auth.slack.callback";
import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  const apiUrl = context.cloudflare.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Response("VITE_API_URL is not configured", { status: 500 });
  }
  return { apiUrl };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "認証処理中 - 勤怠管理システム" },
    { name: "description", content: "Slack認証を処理中です" },
  ];
}

interface AuthCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  session?: any;
}

export default function AuthCallback() {
  const { apiUrl } = useLoaderData<typeof loader>();
  const [state, setState] = useState<AuthCallbackState>({
    status: 'loading',
    message: 'Slack認証を処理中です...'
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          setState({
            status: 'error',
            message: `認証がキャンセルされました: ${error}`
          });
          return;
        }

        if (!code) {
          setState({
            status: 'error',
            message: '認証コードが取得できませんでした'
          });
          return;
        }

        const response = await fetch(`${apiUrl}/auth/slack/callback?code=${code}&state=${state}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setState({
            status: 'error',
            message: data.message || '認証に失敗しました'
          });
          return;
        }

        localStorage.setItem('slack_session', JSON.stringify(data.session));
        setState({
          status: 'success',
          message: '認証が完了しました。リダイレクトしています...',
          session: data.session
        });

        setTimeout(() => {
          window.location.href = '/attendance';
        }, 2000);

      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'ネットワークエラーが発生しました'
        });
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            {state.status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">処理中</h1>
                <p className="text-gray-600">{state.message}</p>
              </>
            )}

            {state.status === 'success' && (
              <>
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">認証成功</h1>
                <p className="text-gray-600 mb-4">{state.message}</p>
                {state.session && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-gray-900 mb-2">ログイン情報</h3>
                    <p className="text-sm text-gray-600">ユーザー: {state.session.user_name}</p>
                    <p className="text-sm text-gray-600">チーム: {state.session.team_name}</p>
                  </div>
                )}
              </>
            )}

            {state.status === 'error' && (
              <>
                <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">認証エラー</h1>
                <p className="text-gray-600 mb-6">{state.message}</p>
                <div className="space-y-3">
                  <a
                    href="/login"
                    className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
                  >
                    再度ログインする
                  </a>
                  <a
                    href="/"
                    className="w-full inline-flex justify-center items-center px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 transition-all duration-200"
                  >
                    ホームに戻る
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
