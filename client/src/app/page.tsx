import SignIn from "@/components/sign-in";
import { AuthTest } from "@/components/AuthTest";
import { DottedSurface } from "@/components/UI/dotted-surface";
import background from "@/components/background";


export default function Home() {
  return (
    <div className="min-h-screen w-full  relative">
      {/* Dark Noise Colored Background */}
      <SignIn/>
      <div className="absolute top-4 left-4">
        <AuthTest />
      </div>
        

      {/* Your other content */}
       
    </div>
  );
}
