import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass-card max-w-md w-full text-center p-12 rounded-[2rem] space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="font-serif text-4xl text-primary">404</span>
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground">Lost your way?</h1>
        <p className="text-muted-foreground text-lg">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="pt-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold bg-foreground text-background shadow-lg hover:bg-foreground/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
