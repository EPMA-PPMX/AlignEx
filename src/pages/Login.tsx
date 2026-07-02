import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "../auth/authConfig";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { accounts, instance, inProgress } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    if (accounts.length > 0) {
      navigate("/home");
      return;
    }

    const handleLogin = async () => {
      if (inProgress !== InteractionStatus.None) {
        return;
      }

      try {
        await instance.loginRedirect(loginRequest);
      } catch (error) {
        console.error("Login Error:", error);
      }
    };

    handleLogin();
  }, [accounts, instance, inProgress, navigate]);

  return null;
};

export default Login;
