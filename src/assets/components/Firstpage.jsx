import logo from "../logo.png"

import { useNavigate } from "react-router-dom";

export default function Firstpage(){

  const navigate = useNavigate();

  const goToLogin = () => {
    navigate("/login"); }

    const goToLogin2 = () => {
    navigate("/StudentLogin"); }

    

    return(


        <div className="outer"><div style={{textAlign : "center"}}>
            <h4> Welcome to GBPIETsync </h4>
            <p>your one stop solution for attendance needs</p>
            </div>
           <img style={{width : "13rem"}} src ={logo} />
            <button onClick={goToLogin} className="btn btn-light btn-lg "  >Faculty login</button>
            <button onClick={goToLogin2} className="btn btn-light btn-lg  "  >Student login</button>
            <p>an web app developed and designed by chiragkashyaprajput</p>
          </div>
    );

}