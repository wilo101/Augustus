import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-[#0b0b0d] via-[#0d0d10] to-[#140a0a]">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold mb-2 text-primary">404</h1>
        <p className="text-base text-muted-foreground mb-4">Page not found</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-md border border-red-900/30 bg-black/40 px-3 py-1.5 text-sm text-red-100 hover:bg-black/60 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
