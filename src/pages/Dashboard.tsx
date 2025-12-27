import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Dashboard is disabled - redirect to home
export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/");
  }, [navigate]);

  return null;
}
