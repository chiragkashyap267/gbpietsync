import { useEffect, useState } from "react";
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from "firebase/database"; // ✅ Added imports
import { app } from "../../Firebase";
import { useClassContext } from "./ClassContext";

// ✅ --- LOADER COMPONENT AND STYLE ---
const ListLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "3rem",
      gap: "1rem",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px"
    }}
  >
    <div className="dashboard-loader"></div>
    <span style={{ fontSize: "1.1rem", color: "#333" }}>Loading Students...</span>
  </div>
);
// ---

// ✅ --- REMOVED 'onDeleteStudent' prop ---
export default function VirtualizedMuiList() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // ✅ NEW: Loading state
  const { selectedClass } = useClassContext();
  const db = getDatabase(app);

  // ✅ --- REWRITTEN DYNAMIC QUERY LOGIC ---
  useEffect(() => {
    // 1. If no class is selected, clear the list and stop.
    if (!selectedClass) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 2. Define the query based on the selected class's criteria
    const studentQuery = query(
      ref(db, "students/"),
      orderByChild("program"),
      equalTo(selectedClass.program)
    );

    // 3. Listen for changes on this query
    const unsubscribe = onValue(studentQuery, (snapshot) => {
      const programStudents = snapshot.val() || {};

      // 4. Manually filter by branch and year (since RTDB only queries on one key)
      const filteredStudents = Object.entries(programStudents)
        .filter(
          ([_, std]) =>
            std.branch === selectedClass.branch &&
            std.year === selectedClass.year
        )
        .map(([id, std]) => ({ id, ...std }));

      setStudents(filteredStudents);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      setStudents([]);
      unsubscribe();
    };
  }, [selectedClass, db]); // This hook correctly re-runs when selectedClass changes
  // ✅ --- END OF NEW LOGIC ---

  // ✅ --- REMOVED 'handleRemoveStudent' function ---

  if (!selectedClass) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "#666",
        }}
      >
        <h5>No class selected</h5>
        <p>Select a class from the left panel to view students</p>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ --- LOADER STYLE --- */}
      <style>
        {`
          .dashboard-loader {
            border: 4px solid #f3f3f3; /* Light grey */
            border-top: 4px solid #437f97; /* Blue */
            border-radius: 50%;
            width: 30px; /* Smaller for list */
            height: 30px; /* Smaller for list */
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Class Info Header */}
      <div
        style={{
          backgroundColor: "#437f97",
          color: "white",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}
      >
        <h5 style={{ margin: 0, marginBottom: "0.5rem" }}>
          {selectedClass.className}
        </h5>
        <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          {selectedClass.program} - {selectedClass.branch} - {selectedClass.year}
        </div>
        <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.3rem" }}>
          Total Students: {isLoading ? "..." : students.length}
        </div>
      </div>

      {/* Students List */}
      <div>
        <h5 style={{ marginBottom: "1rem", color: "#437f97" }}>
          Students Enrolled
        </h5>

        {/* ✅ --- CONDITIONAL LOADING --- */}
        {isLoading ? (
          <ListLoader />
        ) : students.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              color: "#666",
            }}
          >
            No students found for this class
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
          >
            {students.map((student, index) => (
              <div
                key={student.id}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  padding: "1rem",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "#437f97",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "1rem",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {student.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      Institute ID: {student.instituteID || "N/A"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#888",
                        marginTop: "0.2rem",
                      }}
                    >
                      {student.email}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "#666", textAlign: "right" }}>
                    <div style={{ fontWeight: "500" }}>
                      {student.contactNumber}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#888" }}>
                      DOB: {student.dob || "N/A"}
                    </div>
                  </div>
                  
                  {/* ✅ --- REMOVED 'Remove' BUTTON --- */}
                  {/* The button was here, but it's been removed as the list is now dynamic */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

