import React, { Component, ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = "ليس لديك صلاحية للقيام بهذا الإجراء أو الوصول لهذه البيانات.";
        }
      } catch (e) {}

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-4">عذراً، حدث خطأ ما</h2>
            <p className="text-slate-500 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all w-full"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
