import { useEffect, useState } from "react";
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
import "../components/StudentList.css";

// --- LOADER COMPONENT ---
const ListLoader = () => (
  <div className="list-loader-container">
    <div className="dashboard-loader"></div>
    <span>Loading Students...</span>
  </div>
);
// ---

export default function VirtualizedMuiList() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedClass } = useClassContext();
  const db = getDatabase(app);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const studentQuery = query(
      ref(db, "students/"),
      orderByChild("program"),
      equalTo(selectedClass.program)
    );

    const unsubscribe = onValue(studentQuery, (snapshot) => {
      const programStudents = snapshot.val() || {};

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

    return () => {
      setStudents([]);
      unsubscribe();
    };
  }, [selectedClass, db]);

  if (!selectedClass) {
    return (
      <div className="no-class-container">
        <h5>No class selected</h5>
        <p>Select a class from the left panel to view students</p>
      </div>
    );
  }

  return (
    <div className="list-wrapper">
      {/* Class Info Header */}
      <div className="class-info-header">
        <h5 className="class-info-title">{selectedClass.className}</h5>
        <div className="class-info-details">
          {selectedClass.program} - {selectedClass.branch} - {selectedClass.year}
        </div>
        <div className="class-info-count">
          Total Students: {isLoading ? "..." : students.length}
        </div>
      </div>

      {/* Students List */}
      <div className="students-list-container">
        <h5>Students Enrolled</h5>

        {isLoading ? (
          <ListLoader />
        ) : students.length === 0 ? (
          <div className="no-students-found">
            No students found for this class
          </div>
        ) : (
          <div className="students-list">
            {students.map((student, index) => (
              <div key={student.id} className="student-card">
                {/* Left side: Index + Name/ID/Email */}
                <div className="student-info-left">
                  <div className="student-index-circle">{index + 1}</div>
                  <div className="student-details">
                    <div className="student-name">{student.name}</div>
                    <div className="student-id">
                      Institute ID: {student.instituteID || "N/A"}
                    </div>
                    <div className="student-email">{student.email}</div>
                  </div>
                </div>

                {/* Right side: Contact/DOB */}
                <div className="student-info-right">
                  <div className="student-contact">
                    <div className="student-contact-number">
                      {student.contactNumber}
                    </div>
                    <div className="student-dob">
                      DOB: {student.dob || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}