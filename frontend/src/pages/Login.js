import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { auth, signInWithPopup } from '../firebase';
import { GoogleAuthProvider } from 'firebase/auth';

function Login() {
  const navigate = useNavigate();
  const { login } = useUser();

  const handleGoogleLogin = async () => {
    try {
      const dynamicProvider = new GoogleAuthProvider();
      dynamicProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
      dynamicProvider.setCustomParameters({ prompt: "consent" });

      const result = await signInWithPopup(auth, dynamicProvider); // ✅ Use dynamicProvider
      const user = result.user;

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential.accessToken;
      const idToken = await user.getIdToken();

      console.log("✅ Google Sign-in Success:", user);

      const response = await fetch("https://twinmind-backend-fhyd.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await response.json();
      login({ ...data.user, accessToken }); // Store user in global context

      console.log("✅ Backend login response:", data);
      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Google Sign-In failed:", error.message);
    }
  };

  return (
    <div className="login-container">
      <img src="/images/logo.png" alt="TwinMind Logo" className="logo-img" />

      <div className="button-group">
        <button onClick={handleGoogleLogin} className="login-button">
          <FcGoogle size={24} />
          <span>Continue with Google</span>
        </button>
        <button className="login-button">
          <FaApple size={24} />
          <span>Continue with Apple</span>
        </button>
      </div>

      <footer>
        <button>Privacy Policy</button>
        <button>Terms of Service</button>
      </footer>
    </div>
  );
}

export default Login;
