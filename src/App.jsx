import "./App.css";
import Firstpage from "./assets/components/Firstpage";
import StudentLogin from "./assets/components/StudentLogin";
import Login from "./assets/components/Login";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./assets/components/Dashboard";
import StudentDashboard from "./assets/components/StudentDashboard";
import StudRegForm from "./assets/components/StudRegForm";

function App() {
  return <>

  
  <Routes>
    <Route path ="/" element ={<Firstpage/>}/>  
    <Route path ="/Login" element ={<Login/>}/>  
    <Route path ="/StudentLogin" element ={<StudentLogin/>}/> 
    <Route path = "/dashboard" element ={<Dashboard />}/>
    <Route path = "/StudentDashboard" element ={<StudentDashboard />}/>
    <Route path = "/StudRegForm" element ={<StudRegForm />}/>
  
    
  </Routes>
 

  
  </>
}

export default App;
