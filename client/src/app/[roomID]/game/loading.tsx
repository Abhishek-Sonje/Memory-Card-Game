import Loader from "@/components/UI/Loader";

export default function Loading() {
  return (
    <div className="flex justify-center items-center h-screen ">
      <Loader message="Loading Game..." />
    </div>
  );
}
