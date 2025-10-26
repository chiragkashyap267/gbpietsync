// *** FIX: ADDED ALL NECESSARY IMPORTS ***
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import "./StudRegForm.css"; // Assuming you have some CSS for styling

// --- Firebase Initialization ---
// Get config from the global variable (this part is fine if __firebase_config is set)
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseConfig = {};
try {
  firebaseConfig = JSON.parse(firebaseConfigStr);
} catch (e) {
  console.error("Could not parse __firebase_config", e);
}

// *** FIX: Correct way to initialize Firebase in a module ***
// This prevents re-initializing the app if it's already been done.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
// --- End Firebase Setup ---


function StudRegForm() {

  // ✅ --- Removed file state variables ---
  // const [fileName, setFileName] = useState("upload your image here");
  // const [fileBase64, setFileBase64] = useState("");
  // const [fileSelected, setFileSelected] = useState(false);
  // ---

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [instituteID, setInstituteID] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [program, setProgram] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const [successMessage, setSuccessMessage] = useState(""); // ✅ State for success message

  const navigate = useNavigate(); // Get navigate function from hook

  const inputStyle = {
    padding: "0.75rem",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
    width: "100%",
    color: "#333",
  };

  const inputPairStyle = {
    display: "flex",
    gap: "1rem",
    width: "100%",
  };

  const halfInputStyle = {
    ...inputStyle,
    flex: 1,
    margin: 0,
  };

  // ✅ --- Removed handleFileChange function ---
  // const handleFileChange = (e) => { ... };
  // ---

  // ✅ Function to clear messages when user types
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage(""); // Clear success message on input change too
  };

  const handleEmailChange = handleInputChange(setEmail);
  const handlePasswordChange = handleInputChange(setPassword);


  const submitHandler = async (event) => {
    event.preventDefault();
    setErrorMessage(""); // Clear previous errors
    setSuccessMessage(""); // Clear previous success messages

    if (!instituteID) {
      setErrorMessage("Please enter a valid Student ID");
      console.error("Please enter a valid Student ID");
      return;
    }
    if (!program) {
        setErrorMessage("Please select a Program");
        console.error("Please select a Program");
        return;
    }
    if (program === 'B.Tech' && !branch) {
      setErrorMessage("Please select a Branch for B.Tech");
      console.error("Please select a Branch for B.Tech");
      return;
    }
    if (program === 'M.Tech' && !branch) {
        setErrorMessage("Please select a Branch for M.Tech");
        console.error("Please select a Branch for M.Tech");
        return;
    }
    if (!year) {
        setErrorMessage("Please select a Year");
        console.error("Please select a Year");
        return;
    }


    setLoading(true);

    try {
      console.log("Starting registration...");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created:", userCredential.user.uid);

      const studentData = {
        name, dob, contactNumber, email, instituteID, program,
        branch: program === 'MCA' ? 'CS' : branch,
        year, createdAt: Date.now(), uid: userCredential.user.uid, fileURL: ""
      };

      console.log("Saving to database path:", `students/${userCredential.user.uid}`);
      await set(ref(db, `students/${userCredential.user.uid}`), studentData);
      console.log("Database write successful!");

      // ✅ Set success message
      setSuccessMessage("Registration successful! Redirecting to login...");

      // Reset form
      setName(""); setDob(""); setInstituteID(""); setContactNumber("");
      setEmail(""); setPassword(""); setProgram(""); setBranch(""); setYear("");

      // ✅ Navigate after a delay to show the success message
      setTimeout(() => {
        // Clear message just before navigating
        setSuccessMessage("");
        navigate("/StudentLogin");
      }, 2000); // Increased delay slightly to 2 seconds

    } catch (error) {
      console.error("Registration error:", error);
      // Set specific error messages
      if (error.code === 'auth/email-already-in-use') { setErrorMessage("This email address is already registered."); }
      else if (error.code === 'auth/weak-password') { setErrorMessage("Password should be at least 6 characters long."); }
      else if (error.code === 'auth/invalid-email') { setErrorMessage("Please enter a valid email address."); }
      else if (error.code === 'PERMISSION_DENIED') { setErrorMessage("Database permission denied. Contact administrator."); }
      else { setErrorMessage("Registration failed. Please try again."); }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/StudentLogin");
  };


  return (
    <div className="outer" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#bad8e2", padding: "2rem 0" }}>
      <div style={{ width: "100%", maxWidth: "450px", background: "#437f97", padding: "2rem", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <h3 style={{ textAlign: "center", color: "#fff", marginBottom: "1.5rem" }}>Student Registration</h3>

        {/* Display Error Message */}
        {errorMessage && (
          <div style={{ backgroundColor: "#f8d7da", color: "#721c24", padding: "0.75rem 1.25rem", marginBottom: "1rem", border: "1px solid #f5c6cb", borderRadius: "5px", textAlign: "center" }}>
            {errorMessage}
          </div>
        )}

        {/* ✅ Display Success Message */}
        {successMessage && (
            <div style={{
                backgroundColor: "#d4edda", // Green background for success
                color: "#155724", // Dark green text
                padding: "0.75rem 1.25rem",
                marginBottom: "1rem",
                border: "1px solid #c3e6cb",
                borderRadius: "5px",
                textAlign: "center"
            }}>
                {successMessage}
            </div>
        )}

        <form onSubmit={submitHandler} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* ROW 1: Program and Year */}
          <div style={inputPairStyle}>
            <select className="form-control"
              value={program}
              onChange={(e) => { // ✅ Use handleInputChange or update here too if needed
                const newProgram = e.target.value;
                setProgram(newProgram);
                setYear("");
                if (newProgram === "MCA") { setBranch("CS"); } else { setBranch(""); }
                if (errorMessage) setErrorMessage(""); // Clear error on change
                if (successMessage) setSuccessMessage("");
              }}
              required style={halfInputStyle} >
              <option value="">Select Program</option>
              <option value="B.Tech">B.Tech</option>
              <option value="MCA">MCA</option>
              <option value="M.Tech">M.Tech</option>
            </select>
            {(program === "B.Tech" || program === "MCA" || program === "M.Tech") && (
              <select className="form-control" value={year} onChange={handleInputChange(setYear)} required style={halfInputStyle} > {/* ✅ Use generic handler */}
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                {program === "B.Tech" && <option value="3rd Year">3rd Year</option>}
                {program === "B.Tech" && <option value="4th Year">4th Year</option>}
              </select>
            )}
          </div>

          {/* ROW 2: Branch Selection / Display */}
          {(program === "B.Tech" || program === "M.Tech") && (
            <select className="form-control" value={branch} onChange={handleInputChange(setBranch)} required={program !== 'MCA'} style={inputStyle} > {/* ✅ Use generic handler */}
              <option value="">Select Branch</option>
              {program === "B.Tech" && <>
                <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="ECE">ECE</option> <option value="EEE">EEE</option>
                <option value="ME">ME</option> <option value="CE">CE</option> <option value="MIN">Mining</option> <option value="CH">Chemical</option>
              </>}
              {program === "M.Tech" && <>
                 <option value="CSE">CSE</option> <option value="ECE">ECE</option> <option value="ME">ME</option> <option value="CIVIL">CIVIL</option>
              </>}
            </select>
          )}
          {program === "MCA" && (
            <input className="form-control" value="Branch: CS" disabled style={{ ...inputStyle, backgroundColor: '#f0f0f0', cursor: 'not-allowed', color: '#555' }} />
          )}

          {/* ROW 3: Name and DOB */}
          <div style={inputPairStyle}>
            <input className="form-control" placeholder="name" value={name} onChange={handleInputChange(setName)} required style={halfInputStyle} /> {/* ✅ Use generic handler */}
            <input type="date" className="form-control" value={dob} onChange={handleInputChange(setDob)} required style={halfInputStyle} /> {/* ✅ Use generic handler */}
          </div>

          {/* ROW 4: Email and Password */}
          <div style={inputPairStyle}>
            <input className="form-control" placeholder="email" type="email" value={email} onChange={handleEmailChange} required style={halfInputStyle} />
            <input className="form-control" placeholder="password" type="password" value={password} onChange={handlePasswordChange} required style={halfInputStyle} />
          </div>

          {/* ROW 5: Student ID and Contact Number */}
          <div style={inputPairStyle}>
            <input className="form-control" placeholder="Student ID" value={instituteID} onChange={handleInputChange(setInstituteID)} required style={halfInputStyle} /> {/* ✅ Use generic handler */}
            <input className="form-control" type="tel" placeholder="contact number" value={contactNumber} onChange={handleInputChange(setContactNumber)} required style={halfInputStyle} /> {/* ✅ Use generic handler */}
          </div>

          <button type="submit" disabled={loading || successMessage} className="btn btn-seconda" // ✅ Disable button if showing success message
            style={{ backgroundColor: loading ? "#95a5a6" : "#ffff00", color: "#437f97", fontWeight: "bold", padding: "0.75rem", borderRadius: "5px", border: "none", cursor: (loading || successMessage) ? "not-allowed" : "pointer", fontSize: "1.1rem" }}>
            {loading ? "Registering..." : (successMessage ? "Success!" : "Register Now")} {/* ✅ Update button text */}
          </button>
        </form>

        <button type="button" onClick={handleGoBack}
          style={{ backgroundColor: "transparent", color: "#ffffff", fontWeight: "600", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ffffff", cursor: "pointer", fontSize: "0.9rem", marginTop: "1rem", width: "100%", opacity: 0.8, transition: "opacity 0.3s ease" }}
          onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.8} >
          Go Back to Login
        </button>
      </div>

      <style> {` .d-none { display: none; } `} </style>
    </div>
  );
}

export default StudRegForm;

