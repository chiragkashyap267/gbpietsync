import { useState, useEffect } from "react"; // ✅ Added useEffect
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import "./Login.css";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ Added useLocation
import { app } from "../../Firebase";

export default function Login() {
  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // ✅ NEW: State for error messages
  const [isLoading, setIsLoading] = useState(false); // ✅ NEW: Loading state
  
  const navigate = useNavigate();
  const location = useLocation(); // ✅ NEW: To get error message from redirects

  // ✅ NEW: Check for redirect error messages
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location]);

  const submitHandler = (e) => {
    e.preventDefault();
    const auth = getAuth(app);
    
    setError(""); // Clear previous errors
    setIsLoading(true); // Start loading

    signInWithEmailAndPassword(auth, userName, password)
      .then((res) => {
        console.log(res.user);
        setIsLoading(false); // Stop loading
        navigate("/dashboard");
      })
      .catch((err) => {
        setIsLoading(false); // Stop loading
        console.error(err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          setError("Invalid email or password.");
        } else {
          setError("An error occurred during login.");
        }
      });
  };

  const goToLogin = () => {
    navigate("/");
  };

  return (
    <div className="outer ">
      <form className="form-container" onSubmit={submitHandler}>
        <h2>Enter your credentials</h2>

        {/* ✅ NEW: Error Message Display */}
        {error && (
          <p style={{ 
            color: '#c0392b', 
            backgroundColor: '#fbe9e7', 
            padding: '0.8rem', 
            borderRadius: '5px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {error}
          </p>
        )}

        <input
          className="form-control"
          type="email" // ✅ Changed to email for clarity
          placeholder="Faculty Email"
          value={userName}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="form-control"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-light" type="submit" disabled={isLoading}>
          {/* ✅ NEW: Loading text */}
          {isLoading ? "Logging in..." : "Submit"}
        </button>
      </form>

      <button onClick={goToLogin} className="btn btn-info">
        Back
      </button>
    </div>
  );
}

