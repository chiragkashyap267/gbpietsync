import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Dashboard.css"; // ✅ Your main CSS file
import SimpleAccordion from "./SimpleAccordion";
import VirtualizedMuiList from "./VirtualizedMuiList";
import { ClassProvider } from "./ClassContext";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  set,
  query,
  orderByChild,
  equalTo,
  startAt,
  endAt,
} from "firebase/database";
import { useNavigate, useLocation } from "react-router-dom";
import { app } from "../../Firebase";

// Allowed faculty list
const ALLOWED_FACULTIES = [
  { name: "Mr. Ashish Negi", email: "ashish@gmail.com" },
  { name: "Mr. Siddharth Ghansela", email: "siddharth@gmail.com" },
  { name: "Mr. Deepak dangwal", email: "deepak@gmail.com" },
  { name: "Mr. Shail Dinker", email: "shail@gmail.com" },
  { name: "Mrs. Preeti Dimri", email: "preeti@gmail.com" },
  { name: "Mr. Krishna Das Narayan", email: "krishna@gmail.com" },
  { name: "Mr. Yashwant singh chauhan", email: "yashwant@gmail.com" },
];

// --- Loader Components ---
const FullPageLoader = () => (
  <div className="full-page-loader">
    <div className="dashboard-loader-large"></div>
    <p className="full-page-loader-text"> Authenticating... </p>
  </div>
);

const SmallSpinner = ({ text = "Loading Students..." }) => (
  <div className="small-spinner">
    <div className="dashboard-loader-small"></div>
    <p className="small-spinner-text">{text}</p>
  </div>
);
// ---

export default function Dashboard() {
  const [facultyName, setFacultyName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [students, setStudents] = useState([]); // Students for the currently selected class in modals
  const [analyzeStart, setAnalyzeStart] = useState("");
  const [analyzeEnd, setAnalyzeEnd] = useState("");
  const [analyzeResults, setAnalyzeResults] = useState([]);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false); // For loading students into modals
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Specific loading for analysis fetch action

  const [program, setProgram] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [classNameText, setClassNameText] = useState("");

  const auth = getAuth(app);
  const db = getDatabase(app);
  const navigate = useNavigate();
  const location = useLocation();

  const loginError = location.state?.error || null; // Check for error passed from login redirect

  // --- Dropdown Options ---
  const availablePrograms = ["B.Tech", "MCA", "M.Tech"];
  const btechBranches = [
    "CSE",
    "ECE",
    "ME",
    "BIOTECH",
    "MFE",
    "CIVIL",
    "EE",
    "AIML",
    "IT",
  ];
  const mcaBranches = ["CS"];
  const mtechBranches = ["CSE", "ECE", "ME", "CIVIL"];
  const btechYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const mcaYears = ["1st Year", "2nd Year"];
  const mtechYears = ["1st Year", "2nd Year"];
  // ---

  // Effect 1: Authentication Check
  useEffect(() => {
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const isAllowed = ALLOWED_FACULTIES.some(
          (fac) => fac.email.toLowerCase() === user.email.toLowerCase()
        );
        if (!isAllowed) {
          console.warn(
            "Access Denied Attempt: Unauthorized email:",
            user.email
          );
          signOut(auth);
          navigate("/Login", {
            replace: true,
            state: {
              error: "Access Denied: You are not an authorized faculty member.",
            },
          });
        } else {
          const faculty = ALLOWED_FACULTIES.find(
            (fac) => fac.email.toLowerCase() === user.email.toLowerCase()
          );
          setFacultyName(faculty?.name || "Faculty"); // Safer access
          setIsAuthLoading(false);
        }
      } else {
        navigate("/Login", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  // Logout Handler
  const handleLogout = () => {
    setSelectedClass(null);
    signOut(auth)
      .then(() => navigate("/Login", { replace: true }))
      .catch((err) => {
        console.error("Logout Error:", err);
        navigate("/Login", { replace: true });
      });
  };

  // Add Class Handler
  const handleAddClass = (e) => {
    e.preventDefault();
    const currentBranch = program === "MCA" ? "CS" : branch; // Ensure branch is set correctly for MCA
    if (!classNameText || !currentBranch || !program || !year) {
      console.error("Please fill all fields for adding a class.");
      return;
    }
    const classRef = ref(db, "classes/");
    push(classRef, {
      program,
      branch: currentBranch,
      year,
      className: classNameText,
      createdBy: facultyName,
      createdByEmail: auth.currentUser?.email,
      timestamp: Date.now(),
    })
      .then(() => {
        console.log(`Class "${classNameText}" created successfully!`);
        setShowForm(false);
        setClassNameText("");
        setBranch("");
        setYear("");
        setProgram("");
      })
      .catch((error) => console.error("Error creating class:", error));
  };

  // ✅ --- FIXED Delete Class Handler ---
  // Now only requires classId, as provided by SimpleAccordion
  const handleDeleteClass = (classId) => {
    if (
      !classId ||
      !window.confirm(
        `Are you sure you want to delete this class? This will also delete all associated attendance records.`
      )
    ) {
      return;
    }

    remove(ref(db, `classes/${classId}`))
      .then(() => console.log(`Class ${classId} deleted successfully`))
      .catch((err) => console.error("Error deleting class:", err));

    remove(ref(db, `attendance/${classId}`))
      .then(() =>
        console.log(`Attendance records for class ${classId} deleted`)
      )
      .catch((err) => console.error("Error deleting attendance records:", err));
  };
  // ---

  // Common student fetching logic for modals
  const fetchStudentsForClass = (classData, callback) => {
    setIsLoadingStudents(true);
    setStudents([]);
    if (!classData || !classData.program || !classData.branch || !classData.year) {
      console.error(
        "fetchStudentsForClass: Invalid classData provided",
        classData
      );
      setIsLoadingStudents(false);
      return;
    }
    const studentQuery = query(
      ref(db, "students/"),
      orderByChild("program"),
      equalTo(classData.program)
    );
    onValue(
      studentQuery,
      (snapshot) => {
        const programStudents = snapshot.val() || {};
        const classStudents = Object.entries(programStudents)
          .filter(
            ([_, std]) =>
              std.branch === classData.branch && std.year === classData.year
          )
          .map(([id, std]) => ({ id, ...std }));
        classStudents.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setStudents(classStudents);
        setIsLoadingStudents(false);
        if (callback) callback(classStudents);
      },
      (error) => {
        console.error("Error fetching students for class:", error);
        setIsLoadingStudents(false);
      },
      { onlyOnce: true }
    );
  };

  // Open Modal Handlers
  const openAttendanceModal = (classData, classId) => {
    setSelectedClass({ ...classData, id: classId });
    setShowAttendanceModal(true);
    setAttendanceData({});
    fetchStudentsForClass(classData, (loadedStudents) => {
      const initialAttendance = {};
      loadedStudents.forEach((student) => {
        initialAttendance[student.id] = "present";
      });
      setAttendanceData(initialAttendance);
    });
  };

  const openAnalyzeModal = (classData) => {
    if (!classData || !classData.id) {
      console.error(
        "Cannot open Analyze Modal: Invalid class data provided.",
        classData
      );
      return;
    }
    setSelectedClass(classData);
    setShowAnalyzeModal(true);
    setIsAnalyzing(false);
    setAnalyzeResults([]);
    setAnalyzeStart("");
    setAnalyzeEnd("");
    fetchStudentsForClass(classData);
  };

  // Attendance Marking
  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };
  const submitAttendance = () => {
    if (!selectedClass || students.length === 0) {
      console.warn("Cannot submit attendance.");
      return;
    }
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!selectedClass.id) {
      console.error("Cannot submit attendance, selectedClass ID is missing.");
      return;
    }
    const attendanceRef = ref(
      db,
      `attendance/${selectedClass.id}/${dateStr}_${now.getTime()}`
    );
    set(attendanceRef, {
      date: dateStr,
      time: timeStr,
      timestamp: now.getTime(),
      className: selectedClass.className,
      markedBy: facultyName,
      records: attendanceData,
    })
      .then(() => {
        console.log("Attendance marked successfully!");
        setShowAttendanceModal(false);
        generateAttendancePDF(
          selectedClass,
          dateStr,
          timeStr,
          students,
          attendanceData
        );
        setAttendanceData({});
        setStudents([]);
      })
      .catch((err) => console.error("Error submitting attendance:", err));
  };

  // --- Attendance Analysis ---
  const fetchAttendanceAnalysis = () => {
    if (!analyzeStart || !analyzeEnd || !selectedClass || !selectedClass.id) {
      console.error("Select class with valid ID and date range.");
      setIsAnalyzing(false);
      return;
    }
    if (students.length === 0) {
      console.error("Cannot analyze: Student list is empty.");
      setIsAnalyzing(false);
      return;
    }

    const start = new Date(analyzeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(analyzeEnd);
    end.setHours(23, 59, 59, 999);
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    if (startTimestamp > endTimestamp) {
      console.error("Start date cannot be after end date.");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeResults([]);
    const analysisPath = `attendance/${selectedClass.id}`;

    const attendanceQuery = query(
      ref(db, analysisPath),
      orderByChild("timestamp"),
      startAt(startTimestamp),
      endAt(endTimestamp)
    );

    onValue(
      attendanceQuery,
      (snapshot) => {
        const recordsInRange = snapshot.val() || {};
        const recordCount = Object.keys(recordsInRange).length;

        if (recordCount === 0) {
          console.warn(
            "[Analysis] No attendance records found within the selected date range."
          );
        }

        const stats = {};
        students.forEach((s) => {
          if (s && s.id) {
            stats[s.id] = { present: 0, absent: 0, leave: 0 };
          }
        });

        Object.entries(recordsInRange).forEach(([recordKey, record]) => {
          if (record && record.records && typeof record.records === "object") {
            Object.entries(record.records).forEach(([studentId, status]) => {
              const cleanStatus =
                typeof status === "string" ? status.trim().toLowerCase() : null;
              if (stats[studentId]) {
                if (
                  cleanStatus === "present" ||
                  cleanStatus === "absent" ||
                  cleanStatus === "leave"
                ) {
                  stats[studentId][cleanStatus]++;
                }
              }
            });
          }
        });

        const results = students
          .map((s) => {
            if (!s || !s.id) return null;
            const sStats = stats[s.id] || { present: 0, absent: 0, leave: 0 };
            const total = sStats.present + sStats.absent + sStats.leave;
            const percentage = total
              ? ((sStats.present / total) * 100).toFixed(2)
              : "0.00";
            return { ...s, ...sStats, total, percentage };
          })
          .filter((result) => result !== null);

        setAnalyzeResults(results);
        setIsAnalyzing(false);
      },
      (error) => {
        console.error("[Analysis] Firebase Query Error:", error);
        setIsAnalyzing(false);
      },
      { onlyOnce: true }
    );
  };
  // ---

  // PDF Generation (Keep existing)
  const generateAttendancePDF = (cls, date, time, studentList, records) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Attendance Report - ${cls.className}`, 14, 20);
    doc.setFontSize(12);
    doc.text(
      `Program: ${cls.program} | Branch: ${cls.branch} | Year: ${cls.year}`,
      14,
      28
    );
    doc.text(`Date: ${date}`, 14, 36);
    doc.text(`Time: ${time}`, 14, 42);
    const tableData = studentList.map((s, i) => [
      i + 1,
      s.name,
      s.instituteID || "N/A",
      s.email || "N/A",
      s.contactNumber || "N/A",
      (records[s.id] || "N/A").toUpperCase(),
    ]);
    autoTable(doc, {
      startY: 50,
      head: [["#", "Name", "Institute ID", "Email", "Contact", "Status"]],
      body: tableData,
      styles: { fontSize: 10 },
    });
    doc.save(`${cls.className}_Attendance_${date}.pdf`);
  };
  const generateAnalysisPDF = () => {
    if (!selectedClass || analyzeResults.length === 0) {
      console.error("No analysis data to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Attendance Analysis - ${selectedClass.className}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Report from ${analyzeStart} to ${analyzeEnd}`, 14, 28);
    const tableData = analyzeResults.map((s, i) => [
      i + 1,
      s.name,
      s.instituteID || "N/A",
      s.present,
      s.absent,
      s.leave,
      s.total,
      `${s.percentage}%`,
    ]);
    autoTable(doc, {
      startY: 35,
      head: [
        [
          "#",
          "Name",
          "Institute ID",
          "Present",
          "Absent",
          "Leave",
          "Total",
          "Percentage",
        ],
      ],
      body: tableData,
      styles: { fontSize: 9 },
    });
    doc.save(
      `${selectedClass.className}_Analysis_${analyzeStart}_to_${analyzeEnd}.pdf`
    );
  };
  // ---

  // Helper Functions for Dropdowns
  const getBranches = () => {
    switch (program) {
      case "B.Tech":
        return btechBranches;
      case "MCA":
        return mcaBranches;
      case "M.Tech":
        return mtechBranches;
      default:
        return [];
    }
  };
  const getYears = () => {
    switch (program) {
      case "B.Tech":
        return btechYears;
      case "MCA":
        return mcaYears;
      case "M.Tech":
        return mtechYears;
      default:
        return [];
    }
  };

  // --- Render ---
  if (isAuthLoading) return <FullPageLoader />;

  return (
    <ClassProvider>
      <div className="dashboard-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <h2 className="dashboard-greeting">
            Welcome, {facultyName || "Faculty"} 👋
          </h2>
          <div className="dashboard-header-actions">
            <button
              className="header-btn btn-add-class"
              onClick={() => setShowForm(true)}
            >
              Add New Class
            </button>
            <button className="header-btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Display Login Error if passed via state */}
        {loginError && (
          <div className="login-error-message">{loginError}</div>
        )}

        {/* ADD CLASS MODAL */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Class</h3>
              <form onSubmit={handleAddClass}>
                <select
                  value={program}
                  onChange={(e) => {
                    setProgram(e.target.value);
                    setBranch(e.target.value === "MCA" ? "CS" : "");
                    setYear("");
                  }}
                  required
                >
                  <option value="">Select Program</option>
                  {availablePrograms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={!program || program === "MCA"}
                  required={program !== "MCA"}
                >
                  <option value="">Select Branch</option>
                  {program === "MCA" && (
                    <option value="CS" disabled>
                      CS
                    </option>
                  )}
                  {getBranches().map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={!program}
                  required
                >
                  <option value="">Select Year</option>
                  {getYears().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Enter Subject / Class Name"
                  value={classNameText}
                  onChange={(e) => setClassNameText(e.target.value)}
                  required
                />
                <div className="modal-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MARK ATTENDANCE MODAL */}
        {showAttendanceModal && selectedClass && (
          <div
            className="modal-overlay"
            onClick={() => setShowAttendanceModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Mark Attendance - {selectedClass.className}</h3>
              <p>
                {new Date().toLocaleDateString()} •{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="student-list-container">
                {isLoadingStudents ? (
                  <SmallSpinner />
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <div key={student.id} className="attendance-student-row">
                      <div className="attendance-student-info">
                        <div className="student-name">{student.name}</div>
                        <div className="student-id">
                          Institute ID: {student.instituteID}
                        </div>
                      </div>
                      <div className="attendance-button-group">
                        {["present", "absent", "leave"].map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleAttendanceChange(student.id, status)
                            }
                            className={`attendance-status-btn btn-${status} ${
                              attendanceData[student.id] === status
                                ? "active"
                                : ""
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="modal-empty-state">
                    No students found matching this class criteria.
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAttendanceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={submitAttendance}
                  disabled={isLoadingStudents || students.length === 0}
                >
                  Submit Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYZE ATTENDANCE MODAL */}
        {showAnalyzeModal && selectedClass && (
          <div
            className="modal-overlay"
            onClick={() => setShowAnalyzeModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Analyze Attendance - {selectedClass.className}</h3>
              <div className="analysis-controls">
                <input
                  type="date"
                  value={analyzeStart}
                  onChange={(e) => setAnalyzeStart(e.target.value)}
                  disabled={isLoadingStudents || isAnalyzing}
                />
                <span>to</span>
                <input
                  type="date"
                  value={analyzeEnd}
                  onChange={(e) => setAnalyzeEnd(e.target.value)}
                  disabled={isLoadingStudents || isAnalyzing}
                />
                <button
                  type="button"
                  className="btn-submit"
                  onClick={fetchAttendanceAnalysis}
                  disabled={
                    isLoadingStudents ||
                    isAnalyzing ||
                    !analyzeStart ||
                    !analyzeEnd ||
                    students.length === 0
                  }
                >
                  {isAnalyzing ? "Fetching..." : "Fetch"}
                </button>
              </div>
              <div className="analysis-results-container">
                {isLoadingStudents ? (
                  <SmallSpinner text="Loading Students..." />
                ) : isAnalyzing ? (
                  <SmallSpinner text="Analyzing Attendance..." />
                ) : analyzeResults.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Institute ID</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Leave</th>
                        <th>Total</th>
                        <th>Attd. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzeResults.map((s, i) => (
                        <tr key={s.id || i}>
                          <td>{s.name}</td>
                          <td>{s.instituteID || "N/A"}</td>
                          <td>{s.present}</td>
                          <td>{s.absent}</td>
                          <td>{s.leave}</td>
                          <td>{s.total}</td>
                          <td>{s.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  !isLoadingStudents &&
                  !isAnalyzing && (
                    <p className="modal-empty-state">
                      {students.length > 0
                        ? "Select date range and fetch attendance. No records found in range."
                        : "No students found matching this class criteria."}
                    </p>
                  )
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAnalyzeModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-export-pdf"
                  onClick={generateAnalysisPDF}
                  disabled={
                    analyzeResults.length === 0 ||
                    isLoadingStudents ||
                    isAnalyzing
                  }
                >
                  Export to PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="dashBoardOuter">
          <div className="leftSide">
            <h4>Select Class</h4>
            <SimpleAccordion
              onDeleteClass={handleDeleteClass}
              onMarkAttendance={openAttendanceModal}
              onAnalyzeAttendance={openAnalyzeModal}
            />
          </div>
          <div className="rightSide">
            <h4>Students in Selected Class</h4>
            <div className="rightSide-list-container">
              <VirtualizedMuiList />
            </div>
          </div>
        </div>
      </div>
    </ClassProvider>
  );
}