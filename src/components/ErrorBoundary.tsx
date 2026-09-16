import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('geofence_att_auth_v1');
      localStorage.removeItem('saata_active_tab_v1');
      localStorage.removeItem('saata_mobile_tab_v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#efe8de] text-stone-900 flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-md w-full bg-white border border-[#ded4c5] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-700" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-stone-900 tracking-tight">
                {this.props.fallbackTitle || 'Application Notice'}
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                The application encountered an unexpected display issue while loading your session. You can reload or reset your active session.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-left font-mono text-[10px] text-stone-700 max-h-24 overflow-y-auto break-all">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="py-3 px-4 bg-[#f5efe6] hover:bg-[#ede4d6] text-stone-800 border border-[#ded4c5] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
              >
                <LogOut className="w-4 h-4 text-stone-600" />
                <span>Reset & Sign In</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
