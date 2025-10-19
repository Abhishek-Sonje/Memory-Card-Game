import SignIn from "@/components/sign-in";
import { AuthTest } from "@/components/AuthTest";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black relative">
      {/* Dark Noise Colored Background */}
      <SignIn/>
      <div className="absolute top-4 left-4">
        <AuthTest />
      </div>
    </div>
  );
}
