import { createContext, useContext, useState, useEffect } from "react";

const ClassContext = createContext();

export function ClassProvider({ children }) {
  const [selectedClass, setSelectedClass] = useState(() => {
    const saved = localStorage.getItem("selectedClass");
    return saved ? JSON.parse(saved) : null;
  });

  const [classes, setClasses] = useState(() => {
    const saved = localStorage.getItem("savedClasses");
    return saved ? JSON.parse(saved) : [];
  });

  // Save selectedClass when changed
  // In ClassContext.js

  // Save selectedClass when changed
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("selectedClass", JSON.stringify(selectedClass));
    } else {
      // ✅ This is new: Clear localStorage when no class is selected
      localStorage.removeItem("selectedClass");
    }
  }, [selectedClass]);

  // Save classes when changed
  useEffect(() => {
    if (classes.length > 0) {
      localStorage.setItem("savedClasses", JSON.stringify(classes));
    }
  }, [classes]);

  return (
    <ClassContext.Provider value={{ selectedClass, setSelectedClass, classes, setClasses }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClassContext() {
  const context = useContext(ClassContext);
  if (!context) {
    throw new Error("useClassContext must be used within ClassProvider");
  }
  return context;
}
