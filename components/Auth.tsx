import React, { useState } from 'react';
import { TriasLogo, ErrorIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

export const Auth: React.FC = () => {
  const { dispatch } = useAppContext();
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      // Spec requires domain validation, we'll simulate that.
      if (email.endsWith('@trias.co.jp') && password === 'password') {
        const userRole = email.startsWith('admin') ? 'admin' : 'employee';
        // FIX: The LOGIN action now expects a payload with user info.
        dispatch({ type: 'LOGIN', payload: { email, role: userRole }});
      } else {
        setError('無効な資格情報です。@trias.co.jpドメインのメールアドレスを使用してください。');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleDevQuickLogin = (role: 'admin' | 'employee') => {
    setIsLoading(true);
    setError('');
    const email = `${role}@trias.co.jp`;
    setTimeout(() => {
      // FIX: The LOGIN action now expects a payload with user info.
      dispatch({ type: 'LOGIN', payload: { email, role } });
    }, 500);
  };

  return (
    <div
      className="flex items-center justify-center h-screen w-screen"
      style={{
        background: 'linear-gradient(to right, #7DD3FC 0%, #D8BFD8 50%, #4338CA 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="w-full max-w-md p-apple-xl space-y-apple-xl bg-white/60 dark:bg-black/50 backdrop-blur-lg rounded-apple-card shadow-apple-modal border border-white/20 dark:border-white/10">
        <div className="flex flex-col items-center text-center">
          <TriasLogo className="w-16 h-16" />
          <h1 className="mt-apple-base text-apple-large-title font-sf-semibold text-apple-label-light dark:text-apple-label-dark">
            ET AI
          </h1>
          <p className="mt-apple-xs text-apple-subhead text-apple-label-secondary-light dark:text-apple-label-secondary-dark">Ethics & Transparency Engine</p>
        </div>

        <form className="space-y-apple-base" onSubmit={handleLogin}>
          <div className="space-y-apple-md">
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-apple-field relative block w-full px-apple-base py-apple-md min-h-touch bg-white/70 dark:bg-black/50 placeholder:text-apple-label-tertiary-light dark:placeholder:text-apple-label-secondary-dark text-apple-label-light dark:text-apple-label-dark border border-apple-gray4-light/50 dark:border-apple-gray4-dark/50 focus:outline-none focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:border-apple-blue-light dark:focus:border-apple-blue-dark text-apple-body"
                placeholder="メール (user@trias.co.jp)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="password" className="sr-only">パスワード</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-apple-field relative block w-full px-apple-base py-apple-md min-h-touch bg-white/70 dark:bg-black/50 placeholder:text-apple-label-tertiary-light dark:placeholder:text-apple-label-secondary-dark text-apple-label-light dark:text-apple-label-dark border border-apple-gray4-light/50 dark:border-apple-gray4-dark/50 focus:outline-none focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:border-apple-blue-light dark:focus:border-apple-blue-dark text-apple-body"
                placeholder="パスワード (password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
          </div>

          {error && (
            <div role="alert" className="flex items-center justify-center space-x-apple-sm text-apple-footnote text-apple-red-light dark:text-apple-red-dark">
              <ErrorIcon className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-apple-md px-apple-base text-apple-body font-sf-semibold rounded-apple-button min-h-touch text-white bg-apple-blue-light dark:bg-apple-blue-dark hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-apple-bg-secondary-light dark:focus:ring-offset-apple-bg-secondary-dark focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark disabled:bg-apple-gray5 disabled:text-apple-label-tertiary-light dark:disabled:text-apple-label-tertiary-dark disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {isLoading ? '認証中...' : 'ログイン'}
            </button>
          </div>
        </form>
        <div className="space-y-apple-base">
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-apple-gray4-light/50 dark:border-apple-gray4-dark/50" /></div>
                <div className="relative flex justify-center"><span className="bg-white/60 dark:bg-black/50 px-apple-sm text-apple-body text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark rounded-apple-capsule">Or</span></div>
            </div>

            <div className="text-center">
                <h3 className="text-apple-subhead font-sf-medium text-apple-label-secondary-light dark:text-apple-label-secondary-dark">
                    <span role="img" aria-label="tools" className="mr-apple-sm">🛠️</span>
                    開発者用クイックログイン
                </h3>
                <div className="flex gap-4 mt-4">
                  <button onClick={() => handleDevQuickLogin('employee')} disabled={isLoading} className="w-full flex justify-center py-apple-sm px-apple-base text-apple-body font-sf-semibold rounded-apple-button min-h-touch text-white bg-apple-green-light dark:bg-apple-green-dark hover:brightness-110 disabled:bg-apple-gray5 disabled:cursor-not-allowed transition-colors">
                      社員としてログイン
                  </button>
                  <button onClick={() => handleDevQuickLogin('admin')} disabled={isLoading} className="w-full flex justify-center py-apple-sm px-apple-base text-apple-body font-sf-semibold rounded-apple-button min-h-touch text-white bg-apple-purple-light dark:bg-apple-purple-dark hover:brightness-110 disabled:bg-apple-gray5 disabled:cursor-not-allowed transition-colors">
                      管理者としてログイン
                  </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};