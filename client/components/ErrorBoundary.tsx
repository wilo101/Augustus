import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("App crashed:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
					<div className="max-w-lg w-full rounded-lg border border-red-900/40 bg-black/40 p-4">
						<h2 className="text-red-400 font-semibold mb-2">Something went wrong</h2>
						<p className="text-sm text-muted-foreground mb-3">
							An error occurred while rendering the app. Please check the console for details.
						</p>
						{this.state.error && (
							<pre className="text-xs whitespace-pre-wrap break-words bg-black/30 p-2 rounded border border-red-900/30">
								{this.state.error.message}
							</pre>
						)}
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}


