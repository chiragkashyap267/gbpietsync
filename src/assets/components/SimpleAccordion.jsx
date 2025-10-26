import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from "firebase/database";
import { app } from "../../Firebase";
import { useClassContext } from "./ClassContext";

export default function SimpleAccordion({ onDeleteClass, onMarkAttendance, onAnalyzeAttendance }) {
  const [classes, setClasses] = useState({});
  const { selectedClass, setSelectedClass } = useClassContext();
  const db = getDatabase(app);
  const auth = getAuth(app);

 // In SimpleAccordion.js

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return; // safety check

    const facultyEmail = user.email;
    const baseClassRef = ref(db, "classes/");
    const facultyClassesQuery = query(
      baseClassRef,
      orderByChild("createdByEmail"),
      equalTo(facultyEmail)
    );

    const unsubscribe = onValue(facultyClassesQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const validClassIds = Object.keys(data); // Get all valid class IDs for this faculty

      // --- New Validation Logic ---
      if (validClassIds.length > 0) {
        // 1. We have classes, so group them
        const grouped = {};
        Object.entries(data).forEach(([id, classData]) => {
          const program = classData.program || "Unknown Program";
          if (!grouped[program]) grouped[program] = [];
          grouped[program].push({ id, ...classData });
        });
        setClasses(grouped);

        // 2. Check if the class from localStorage is in our valid list
        if (selectedClass && !validClassIds.includes(selectedClass.id)) {
          // It's not! This is a stale class. Clear it.
          setSelectedClass(null);
        }
      } else {
        // 1. No classes found for this faculty
        setClasses({});
        // 2. We MUST clear any selectedClass that was loaded from localStorage
        setSelectedClass(null);
      }
      // --- End New Logic ---
    });

    return () => unsubscribe();
  }, [db, auth, selectedClass, setSelectedClass]); // 👈 Add selectedClass and setSelectedClass here

  const handleClassClick = (classData) => {
    setSelectedClass(classData);
  };

  const handleDeleteClick = (e, classId) => {
    e.stopPropagation();
    onDeleteClass(classId);
  };

  const handleAttendanceClick = (e, classData) => {
    e.stopPropagation();
    onMarkAttendance(classData, classData.id);
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      {Object.keys(classes).length === 0 ? (
        <Typography style={{ color: "#666", textAlign: "center", marginTop: "2rem" }}>
          No classes created yet. Click "Add New Class" to create one.
        </Typography>
      ) : (
        Object.entries(classes).map(([program, programClasses]) => (
          <Accordion
            key={program}
            sx={{ backgroundColor: "#437f97", color: "white", marginBottom: "0.5rem" }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
              aria-controls={`${program}-content`}
              id={`${program}-header`}
            >
              <Typography fontWeight="600">{program}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {programClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    style={{
                      backgroundColor: selectedClass?.id === classItem.id ? "#ffffff" : "#5a8fa8",
                      borderRadius: "6px",
                      border: "1px solid #ffffff",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => handleClassClick(classItem)}
                      style={{
                        width: "100%",
                        color:
                          selectedClass?.id === classItem.id ? "#437f97" : "#ffffff",
                        backgroundColor: "transparent",
                        border: "none",
                        padding: "0.8rem",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: selectedClass?.id === classItem.id ? "600" : "400",
                      }}
                    >
                      <div style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>
                        {classItem.className}
                      </div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                        {classItem.branch} - {classItem.year}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          opacity: 0.8,
                          marginTop: "0.2rem",
                        }}
                      >
                        
                      </div>
                    </button>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.5rem 0.8rem",
                        borderTop:
                          selectedClass?.id === classItem.id
                            ? "1px solid #e0e0e0"
                            : "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      <button
                        onClick={(e) => handleAttendanceClick(e, classItem)}
                        style={{
                          flex: 1,
                          backgroundColor: "#27ae60",
                          color: "#fff",
                          border: "none",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Mark Attendance
                      </button>

                      <button
                        style={{
                          backgroundColor: "#3498db",
                          color: "#fff",
                          border: "none",
                          padding: "0.4rem 0.8rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyzeAttendance(classItem);
                        }}
                      >
                        Analyze Attendance
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(e, classItem.id)}
                        style={{
                          backgroundColor: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          padding: "0.5rem 0.8rem",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </div>
  );
}
