import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

export default function FlagGate({ flag, children }: { flag: string; children: ReactNode }) {
  const enabled = useFeatureFlag(flag);
  if (!enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}