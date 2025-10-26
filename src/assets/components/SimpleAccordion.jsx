import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { app } from "../../Firebase";
import { useClassContext } from "./ClassContext";

// Import the new CSS file
import "./SimpleAccordion.css";

export default function SimpleAccordion({
  onDeleteClass,
  onMarkAttendance,
  onAnalyzeAttendance,
}) {
  const [classes, setClasses] = useState({});
  const { selectedClass, setSelectedClass } = useClassContext();
  const db = getDatabase(app);
  const auth = getAuth(app);

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
      const validClassIds = Object.keys(data);

      if (validClassIds.length > 0) {
        const grouped = {};
        Object.entries(data).forEach(([id, classData]) => {
          const program = classData.program || "Unknown Program";
          if (!grouped[program]) grouped[program] = [];
          grouped[program].push({ id, ...classData });
        });
        setClasses(grouped);

        if (selectedClass && !validClassIds.includes(selectedClass.id)) {
          setSelectedClass(null);
        }
      } else {
        setClasses({});
        setSelectedClass(null);
      }
    });

    return () => unsubscribe();
  }, [db, auth, selectedClass, setSelectedClass]);

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
    <div className="accordion-container">
      {Object.keys(classes).length === 0 ? (
        <Typography className="no-classes-message">
          No classes created yet. Click "Add New Class" to create one.
        </Typography>
      ) : (
        Object.entries(classes).map(([program, programClasses]) => (
          <Accordion
            key={program}
            disableGutters
            sx={{
              backgroundColor: "#437f97",
              color: "white",
              marginBottom: "0.5rem",
              "&:before": {
                display: "none", // Removes the default top border
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
              aria-controls={`${program}-content`}
              id={`${program}-header`}
            >
              <Typography fontWeight="600">{program}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "0.5rem" }}>
              <div className="class-list">
                {programClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    // ✅ Dynamically add 'selected' class
                    className={`class-item ${
                      selectedClass?.id === classItem.id ? "selected" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleClassClick(classItem)}
                      className="class-item-button"
                    >
                      <div className="class-item-name">
                        {classItem.className}
                      </div>
                      <div className="class-item-details">
                        {classItem.branch} - {classItem.year}
                      </div>
                    </button>

                    {/* Action Buttons */}
                    <div className="class-item-actions">
                      <button
                        onClick={(e) => handleAttendanceClick(e, classItem)}
                        className="class-action-btn btn-mark"
                      >
                        Mark Attendance
                      </button>

                      <button
                        className="class-action-btn btn-analyze"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyzeAttendance(classItem);
                        }}
                      >
                        Analyze
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(e, classItem.id)}
                        className="class-action-btn btn-delete"
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