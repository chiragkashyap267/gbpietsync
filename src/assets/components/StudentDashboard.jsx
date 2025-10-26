import { useEffect, useState, useRef } from "react";
// import "./StudentDashboard.css"; // Assuming CSS might be added later
import { getDatabase, ref, onValue, query, orderByChild, equalTo, update } from "firebase/database";
import { app } from "../../Firebase"; // Ensure this path is correct
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
// Removed Firebase Storage imports
// import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Loader Component --- (Remains the same)
const FullPageLoader = () => (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f4f7f6" }}>
    <div className="dashboard-loader-large"></div>
    <p style={{ fontSize: "1.2rem", color: "#555", marginTop: "1rem" }}> Loading Student Data... </p>
    <style>
      {`
        .dashboard-loader-large { border: 4px solid #f3f3f3; border-top: 4px solid #437f97; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        .dashboard-loader-small { border: 3px solid #f3f3f3; border-top: 3px solid #437f97; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}
    </style>
  </div>
);
// ---

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [allAttendanceRecords, setAllAttendanceRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const auth = getAuth();
  const db = getDatabase(app);
  // Removed storage initialization
  // const storage = getStorage(app);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Effect 1: Auth and Student Data Listener (Reads fileBase64 now)
  useEffect(() => {
    setIsLoading(true);
    let unsubscribeDb = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDb) unsubscribeDb();

      if (user) {
        const studentQuery = query(ref(db, "students"), orderByChild("email"), equalTo(user.email));
        unsubscribeDb = onValue(studentQuery, (snapshot) => {
          const data = snapshot.val();
          if (data && Object.keys(data).length > 0) {
            const sId = Object.keys(data)[0];
            // Now reads `fileBase64` if it exists
            setStudentData(data[sId]);
            setStudentName(data[sId].name || "");
            setStudentId(sId);
            setIsLoading(false);
          } else {
            console.warn("Student record not found for email:", user.email);
            setIsLoading(false);
            setStudentData(null); setStudentId(null); setStudentName("");
            navigate("/StudentLogin", { replace: true, state: { error: "Student record not found." } });
          }
        }, (error) => {
          console.error("Firebase DB Error (Student Data):", error);
          setIsLoading(false);
          navigate("/StudentLogin", { replace: true, state: { error: "Error fetching student data." } });
        });
      } else {
        setIsLoading(false);
        setStudentData(null); setStudentId(null); setStudentName("");
        setEnrolledClasses([]); setAttendanceStats({}); setAllAttendanceRecords({});
        navigate("/StudentLogin", { replace: true });
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) unsubscribeDb();
    };
  }, [auth, db, navigate]);

  // Effect 2: Fetch enrolled classes (Remains the same)
  useEffect(() => {
    if (!studentData || !studentId) { setEnrolledClasses([]); return; }
    const classesQuery = query(ref(db, "classes/"), orderByChild("program"), equalTo(studentData.program));
    const unsubscribe = onValue(classesQuery, (snapshot) => {
      const classesData = snapshot.val() || {};
      const myClasses = Object.entries(classesData)
        .filter(([id, cls]) => cls.branch === studentData.branch && cls.year === studentData.year)
        .map(([id, cls]) => ({ id, ...cls }));
      setEnrolledClasses(myClasses);
    }, (error) => console.error("Firebase DB Error (Classes):", error));
    return () => unsubscribe();
  }, [studentData, studentId, db]);

  // Effect 3: Fetch attendance (Remains the same)
  useEffect(() => {
    if (enrolledClasses.length === 0 || !studentId) { setAttendanceStats({}); setAllAttendanceRecords({}); return; }
    setAttendanceStats({}); setAllAttendanceRecords({});
    const listeners = enrolledClasses.map((cls) => {
      const attendanceRef = ref(db, `attendance/${cls.id}`);
      return onValue(attendanceRef, (snapshot) => {
        const records = snapshot.val() || {}; let present = 0, absent = 0, leave = 0; const detailedRecords = [];
        Object.values(records).forEach(record => {
          const status = record.records?.[studentId];
          if (status) { detailedRecords.push({ date: record.date || 'N/A', time: record.time || 'N/A', markedBy: record.markedBy || 'N/A', status: status }); if (status === 'present') present++; else if (status === 'absent') absent++; else if (status === 'leave') leave++; }
        });
        const total = present + absent + leave; const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";
        setAttendanceStats(prev => ({ ...prev, [cls.id]: { present, absent, leave, total, percentage } }));
        detailedRecords.sort((a, b) => { const dateA = new Date(`${a.date} ${a.time || '00:00:00'}`); const dateB = new Date(`${b.date} ${b.time || '00:00:00'}`); if (isNaN(dateA.getTime())) return 1; if (isNaN(dateB.getTime())) return -1; return dateB - dateA; });
        setAllAttendanceRecords(prev => ({ ...prev, [cls.id]: detailedRecords }));
      }, (error) => console.error(`Firebase DB Error (Attendance Class ${cls.id}):`, error));
    });
    return () => listeners.forEach(unsubscribe => unsubscribe());
  }, [enrolledClasses, studentId, db]);

  // --- PDF Generation Functions --- (Remain the same)
  const generateIndividualPDF = (classId, className) => {
    const stats = attendanceStats[classId]; const records = allAttendanceRecords[classId];
    if (!stats || !records || records.length === 0) { console.error("No data for PDF."); return; }
    const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Attendance Report for ${className}`, 14, 20);
    doc.setFontSize(12); doc.text(`Student: ${studentName}`, 14, 28); doc.text(`Institute ID: ${studentData?.instituteID || 'N/A'}`, 14, 36);
    doc.text(`Total Present: ${stats.present}`, 14, 48); doc.text(`Total Absent: ${stats.absent}`, 14, 54); doc.text(`Total On Leave: ${stats.leave}`, 14, 60);
    doc.text(`Total Classes Marked: ${stats.total}`, 14, 66); doc.text(`Overall Percentage: ${stats.percentage}%`, 14, 72);
    const tableData = records.map((r, i) => [i + 1, r.date, r.time, r.status.charAt(0).toUpperCase() + r.status.slice(1), r.markedBy]);
    autoTable(doc, { startY: 80, head: [["#", "Date", "Time", "Status", "Marked By"]], body: tableData });
    doc.save(`${studentName}_${className}_Attendance.pdf`);
  };
  const generateCombinedPDF = () => {
    if (enrolledClasses.length === 0 || Object.keys(attendanceStats).length === 0) { console.error("No data for PDF."); return; }
    const doc = new jsPDF(); doc.setFontSize(16); doc.text("Combined Attendance Report", 14, 20);
    doc.setFontSize(12); doc.text(`Student: ${studentName}`, 14, 28); doc.text(`Institute ID: ${studentData?.instituteID || 'N/A'}`, 14, 36);
    const summaryTableData = enrolledClasses.map(cls => {
      const stats = attendanceStats[cls.id] || { present: 0, absent: 0, leave: 0, total: 0, percentage: "0.00" };
      return [cls.className, stats.present, stats.absent, stats.leave, stats.total, `${stats.percentage}%`];
    });
    autoTable(doc, { startY: 44, head: [["Subject", "Present", "Absent", "Leave", "Total Classes", "Percentage"]], body: summaryTableData });
    doc.save(`${studentName}_Combined_Attendance_Report.pdf`);
  };
  // ---

  // --- Logout Function --- (Remains the same)
  const handleLogout = async () => {
    setStudentData(null); setStudentId(null); setStudentName(""); setEnrolledClasses([]); setAttendanceStats({}); setAllAttendanceRecords({});
    try { await signOut(auth); navigate("/Studentlogin", { replace: true }); }
    catch (error) { console.error("Logout error:", error.message); navigate("/Studentlogin", { replace: true }); }
  };

  // --- Image Upload Functions (Using Base64) ---
  const handleImageClick = () => {
    if (studentId && !isUploading && fileInputRef.current) {
        setUploadError("");
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file || !studentId) {
        console.log("No file selected or studentId missing.");
        return;
    };
    if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file (JPEG, PNG, GIF).");
        console.error("Invalid file type selected.");
        return;
    }

    // ✅ File Size Check (e.g., 1MB) - Crucial for Base64 in RTDB
    const maxSizeInBytes = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSizeInBytes) {
        setUploadError(`File is too large. Max size is ${maxSizeInBytes / 1024 / 1024}MB.`);
        console.error("File size exceeds limit for Base64 storage.");
         if(fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        return;
    }

    setIsUploading(true);
    setUploadError("");
    const reader = new FileReader();

    reader.onloadend = async () => {
        const base64String = reader.result; // This is the base64 data URL
        console.log("Image converted to Base64 (length):", base64String.length); // Log length, not the whole string

        try {
            console.log(`Updating Realtime Database at students/${studentId} with Base64...`);
            const studentDbRef = ref(db, `students/${studentId}`);
            // Save the base64 string under 'fileBase64' key
            await update(studentDbRef, { fileBase64: base64String });
            console.log("Realtime Database updated successfully with Base64.");

            // Optimistic update
            setStudentData(prev => prev ? ({ ...prev, fileBase64: base64String }) : null);

        } catch (error) {
            console.error("Error updating database with Base64:", error);
            if (error.message.includes('permission_denied')) {
                setUploadError("Permission denied. Check Firebase Database rules.");
            } else if (error.message.includes('DATA_TOO_LARGE')) { // Check for specific RTDB size error
                 setUploadError("Image is too large to save directly. Please choose a smaller file (under 1MB).");
            } else {
                setUploadError("Failed to save image data. Please try again.");
            }
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setUploadError("Could not read the selected file.");
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsDataURL(file); // Read the file as a Data URL (base64)
  };
  // ---

  // --- Helper Function --- (Remains the same)
  const getPercentageColor = (percentage) => {
    const perc = parseFloat(percentage); if (perc >= 75) return "#27ae60"; if (perc >= 50) return "#f39c12"; return "#e74c3c";
  };

  // --- Render ---
  if (isLoading) return <FullPageLoader />;
  if (!studentData) return null; // Handle case where student data is null after loading

  return (
    <div className="stouter" style={{ background: "#356b81", minHeight: "100vh", padding: "1.5rem", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }} >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/png, image/jpeg, image/gif" />

      <div className="dashboard-container" style={{ maxWidth: "900px", margin: "0 auto", background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "1rem" }} >
          <h2 style={{ color: "#437f97", margin: 0, fontSize: "1.5rem", fontWeight: "600" }}> Welcome, {studentName || "Student"}! </h2>
          <button className="btn" style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", backgroundColor: "#e74c3c", color: "white", border: "none", cursor: "pointer", transition: "background-color 0.3s ease" }} onClick={handleLogout} onMouseOver={(e) => e.target.style.backgroundColor = "#c0392b"} onMouseOut={(e) => e.target.style.backgroundColor = "#e74c3c"} > Logout </button>
        </div>

        {/* Profile and Info */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center", background: "#fafafa", padding: "1rem", borderRadius: "8px" }} >
          {/* Image Container (Uses fileBase64) */}
          <div
            style={{ flex: "0 0 120px", textAlign: "center", cursor: isUploading ? "default" : "pointer", position: "relative", width: "120px", height: "120px", borderRadius: "50%", border: "3px solid #437f97", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#e0e0e0", }}
            onClick={handleImageClick} title={isUploading ? "Uploading..." : "Click to change profile picture"}
          >
            {/* ✅ Changed src to studentData.fileBase64 */}
            {studentData && studentData.fileBase64 ? (
              <img src={studentData.fileBase64} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isUploading ? 0.5 : 1, display: 'block' }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: 'column', alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#666", textAlign: 'center', padding: '5px', opacity: isUploading ? 0.5 : 1, }}>
                <span style={{ fontSize: '2.5rem', color: '#aaa', marginBottom: '5px'}}> {studentName ? studentName.charAt(0).toUpperCase() : '?'} </span>
                Click to upload profile
              </div>
            )}
            {isUploading && (
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "50%", }}>
                <div className="dashboard-loader-small"></div>
              </div>
            )}
          </div>
          {/* End Image Container */}

          {/* Student Info Details */}
          {studentData && (
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.95rem" }} >
                {uploadError && ( <p style={{ color: '#dc3545', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>{uploadError}</p> )}
                <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#333", fontWeight: "600" }}> Student ID: {studentData.instituteID} </h4>
                <p style={{ margin: 0, color: "#555" }}> <strong style={{ color: "#333" }}>Name:</strong> {studentData.name} </p>
                <p style={{ margin: 0, color: "#555" }}> <strong style={{ color: "#333" }}>Program:</strong> {studentData.program} </p>
                <p style={{ margin: 0, color: "#555" }}> <strong style={{ color: "#333" }}>Branch:</strong> {studentData.branch} - {studentData.year} </p>
                <p style={{ margin: 0, color: "#555" }}> <strong style={{ color: "#333" }}>Contact:</strong> {studentData.contactNumber} </p>
            </div>
          )}
        </div>

        {/* Attendance Download Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h4 style={{ color: "#437f97", margin: 0, fontSize: "1.2rem", fontWeight: "600" }}> Subject-wise Attendance </h4>
            <button className="btn" style={{ fontSize: "0.9rem", padding: "0.6rem 1rem", background: "linear-gradient(45deg, #2980b9, #3498db)", color: "white", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", transition: "all 0.3s ease", opacity: enrolledClasses.length === 0 ? 0.6 : 1, pointerEvents: enrolledClasses.length === 0 ? 'none' : 'auto' }} onClick={generateCombinedPDF} disabled={enrolledClasses.length === 0} onMouseOver={(e) => { if (enrolledClasses.length > 0) { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 10px rgba(0, 0, 0, 0.15)"; } }} onMouseOut={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"; }} > DOWNLOAD COMBINED REPORT </button>
          </div>

          {/* Grid for Attendance Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", }} >
            {isLoading ? <p>Loading classes...</p> : enrolledClasses.length > 0 ? (
              enrolledClasses.map((cls) => {
                const stats = attendanceStats[cls.id];
                const percentageColor = stats && stats.total > 0 ? getPercentageColor(stats.percentage) : "#666";
                return (
                  <div key={cls.id} style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.9rem", background: "white", boxShadow: "0 2px 5px rgba(0,0,0,0.08)", transition: "transform 0.2s ease, box-shadow 0.2s ease" }} onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.08)"; }} >
                    <div style={{ marginBottom: "1rem" }}>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: "1.1rem", display: "block", marginBottom: "0.5rem" }}> {cls.className} </span>
                      {stats ? ( stats.total > 0 ? ( <> <span style={{ display: "block", fontSize: "1rem", marginBottom: "0.25rem" }}> Percentage: <strong style={{ color: percentageColor, fontSize: "1.1rem" }}>{stats.percentage}%</strong> </span> <span style={{ fontSize: "0.85rem", color: "#666" }}> (Present: {stats.present} / Total: {stats.total}) </span> </> ) : ( <span style={{ fontSize: "0.85rem", color: "#666" }}> No attendance marked yet. </span> ) ) : ( <span style={{ fontSize: "0.85rem", color: "#666" }}> Loading attendance... </span> )}
                    </div>
                    <button className="btn" style={{ fontSize: "0.85rem", padding: "0.5rem 0.6rem", border: "1px solid #3498db", backgroundColor: "#fff", color: "#3498db", fontWeight: "600", borderRadius: "5px", cursor: "pointer", width: "100%", transition: "all 0.3s ease", opacity: (!stats || stats.total === 0) ? 0.6 : 1, pointerEvents: (!stats || stats.total === 0) ? "none" : "auto" }} onClick={() => generateIndividualPDF(cls.id, cls.className)} disabled={!stats || stats.total === 0} onMouseOver={(e) => { if (stats && stats.total > 0) { e.target.style.backgroundColor = "#3498db"; e.target.style.color = "#fff"; } }} onMouseOut={(e) => { e.target.style.backgroundColor = "#fff"; e.target.style.color = "#3498db"; }} > DOWNLOAD PDF </button>
                  </div>
                )
              })
            ) : (
              <div style={{ color: "#666", fontSize: "0.9rem", background: "#fafafa", padding: "1rem", borderRadius: "8px", gridColumn: "1 / -1" }} >
                <p style={{margin: 0}}>You are not enrolled in any classes for this program yet.</p>
                <p style={{margin: "0.5rem 0 0 0"}}>Once your faculty creates a class for your program, branch, and year, it will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

