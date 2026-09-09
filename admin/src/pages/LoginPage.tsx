import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export const LoginPage: React.FC = () => {
  const { login } = useAdmin();
  
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid credentials. Use admin / admin.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans select-none">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Side: Clean Minimal Login Form (5 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-center px-4 sm:px-8 lg:px-12 py-6">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3.5 mb-8">
            <img 
              src="/serbisure-logo.png" 
              alt="SerbiSure" 
              className="w-12 h-12 object-contain drop-shadow-sm"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F5A623] tracking-tight">
              Serbisure
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight">
              Holla,<br />Welcome Back
            </h1>
            <p className="text-slate-400 text-sm mt-3 font-normal">
              Hey, welcome back to your admin dashboard
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {/* Username / Email Input */}
            <div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or Email (admin)"
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 focus:border-[#F5A623] transition-all shadow-2xs"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (admin)"
                className="w-full pl-4 pr-11 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 focus:border-[#F5A623] transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me & Demo Hint */}
            <div className="flex items-center justify-between text-xs pt-1 px-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#F5A623] focus:ring-[#F5A623] border-slate-300 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin');
                }}
                className="text-slate-400 hover:text-[#F5A623] font-medium transition-colors cursor-pointer"
              >
                Mock: admin / admin
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-36 mt-4 py-3 px-6 bg-[#F5A623] hover:bg-[#E08E0B] text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

        </div>

        {/* Right Side: Hero Image (Clean, no overlays) (6 cols) */}
        <div className="lg:col-span-6 flex items-center justify-center p-2">
          <div className="w-full max-w-lg aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl bg-slate-100">
            <img
              src="/login-hero.jpg"
              alt="SerbiSure Kasambahay and Family"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

