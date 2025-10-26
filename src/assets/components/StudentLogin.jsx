import "./StudRegForm.css"; // Assuming shared styles
import React, { useState } from "react"; // ✅ Import React
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
// Make sure you have initialized Firebase in a central file (like index.js or App.js)

function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ✅ State for loading indicator
  const [message, setMessage] = useState({ text: "", type: "" }); // ✅ State for messages {text, type: 'error' | 'success'}

  const auth = getAuth(); // Assumes Firebase is initialized elsewhere
  const navigate = useNavigate();

  // Clear message when user types
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (message.text) setMessage({ text: "", type: "" });
  };
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (message.text) setMessage({ text: "", type: "" });
  };


  const loginHandler = async (event) => {
    event.preventDefault();
    setLoading(true); // Start loading
    setMessage({ text: "", type: "" }); // Clear previous messages

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ Set success message
      setMessage({ text: "Login successful! Redirecting...", type: "success" });
      console.log("Login successful");

      // Navigate after a short delay to show the message
      setTimeout(() => {
        setLoading(false); // Stop loading before navigate
        navigate("/Studentdashboard");
      }, 1500); // 1.5 second delay

    } catch (error) {
      setLoading(false); // Stop loading on error
      console.error("Login Error Code:", error.code); // Log the code for debugging
      console.error("Login Error Message:", error.message);

      // ✅ Set specific error message based on Firebase error code
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setMessage({ text: "Invalid email or password. Please try again.", type: "error" });
      } else if (error.code === 'auth/invalid-email') {
         setMessage({ text: "Please enter a valid email address.", type: "error" });
      } else if (error.code === 'auth/too-many-requests') {
         setMessage({ text: "Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.", type: "error"});
      } else {
        setMessage({ text: "Login failed. Please try again later.", type: "error" }); // Generic error
      }
    }
  };

  const goToRegister = () => {
    navigate("/StudRegForm");
  };

  const goToRegister2 = () => {
    navigate("/");
  };

  return (
    <div
      className="outer"
      style={{
        minHeight: "100vh", display: "flex", justifyContent: "center",
        alignItems: "center", background: "#bad8e2", padding: "1rem" // Added padding for smaller screens
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: "450px", background: "#437f97",
          padding: "2rem", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ textAlign: "center", color: "#fff", marginBottom: "1.5rem" }}>
          Student Login
        </h3>

        {/* ✅ Message Display Area */}
        {message.text && (
          <div style={{
            padding: "0.75rem 1.25rem",
            marginBottom: "1rem",
            border: `1px solid ${message.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
            borderRadius: "5px",
            textAlign: "center",
            backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda',
            color: message.type === 'error' ? '#721c24' : '#155724',
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={loginHandler} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} >
          <input
            className="form-control" placeholder="Enter your email" type="email"
            required value={email} onChange={handleEmailChange} // Use specific handler
            disabled={loading || message.type === 'success'} // Disable inputs while loading/success
          />
          <input
            className="form-control" placeholder="Enter your password" type="password"
            required value={password} onChange={handlePasswordChange} // Use specific handler
            disabled={loading || message.type === 'success'} // Disable inputs while loading/success
          />

          <button
            type="submit" className="btn btn-seconda"
            style={{
              backgroundColor: loading ? "#cccccc" : (message.type === 'success' ? '#28a745' : "yellow"), // Change bg on state
              color: loading ? "#666666" : (message.type === 'success' ? '#ffffff' : "#437f97"),
              padding: "0.6rem", borderRadius: "5px", fontWeight: "bold",
              cursor: (loading || message.type === 'success') ? "not-allowed" : "pointer", // Change cursor
              border: 'none', // Remove border for cleaner look
              display: 'flex', // For centering loader
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '40px' // Ensure button height stays consistent
            }}
            disabled={loading || message.type === 'success'} // Disable button
          >
            {/* ✅ Show loading text or spinner */}
            {loading ? "Logging in..." : (message.type === 'success' ? "Success!" : "Login")}
          </button>

          <button
            type="button" onClick={goToRegister}
            style={{ background: "white", color: "#437f97", padding: "0.6rem", borderRadius: "5px", fontWeight: "bold", border: "2px solid #437f97", cursor: "pointer", }}
            disabled={loading || message.type === 'success'} // Disable other buttons too
          >
            Register New Account
          </button>

          <button
            type="button" onClick={goToRegister2}
            style={{ background: "white", color: "#437f97", padding: "0.6rem", borderRadius: "5px", fontWeight: "bold", border: "2px solid #437f97", cursor: "pointer", }}
            disabled={loading || message.type === 'success'} // Disable other buttons too
          >
            Go back to homepage
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentLogin;

