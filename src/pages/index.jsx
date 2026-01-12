import Layout from "./Layout.jsx";

import AIAssistant from "./AIAssistant";

import BookingConfirmation from "./BookingConfirmation";

import Dashboard from "./Dashboard";

import Home from "./Home";

import HotelDetail from "./HotelDetail";

import Hotels from "./Hotels";

import Login from "./Login";

import ForgotPassword from "./ForgotPassword";

import ResetPassword from "./ResetPassword";

import Packages from "./Packages";

import Settings from "./Settings";

import Transport from "./Transport";

import TransportBooking from "./TransportBooking";

import TripDetail from "./TripDetail";

import TripPlanner from "./TripPlanner";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AIAssistant: AIAssistant,
    
    BookingConfirmation: BookingConfirmation,
    
    Dashboard: Dashboard,
    
    Home: Home,
    
    HotelDetail: HotelDetail,
    
    Hotels: Hotels,
    
    Login: Login,
    
    ForgotPassword: ForgotPassword,
    
    ResetPassword: ResetPassword,
    
    Packages: Packages,
    
    Settings: Settings,
    
    Transport: Transport,
    
    TransportBooking: TransportBooking,
    
    TripDetail: TripDetail,
    
    TripPlanner: TripPlanner,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    // Don't wrap Login, ForgotPassword, and ResetPassword pages with Layout
    const noLayoutPages = ['Login', 'ForgotPassword', 'ResetPassword'];
    const shouldUseLayout = !noLayoutPages.includes(currentPage);
    
    const content = (
        <Routes>            
            
            <Route path="/" element={<Home />} />
            
            <Route path="/AIAssistant" element={<AIAssistant />} />
            
            <Route path="/BookingConfirmation" element={<BookingConfirmation />} />
            
            <Route path="/Dashboard" element={<Dashboard />} />
            
            <Route path="/Home" element={<Home />} />
            
            <Route path="/HotelDetail" element={<HotelDetail />} />
            
            <Route path="/Hotels" element={<Hotels />} />
            
            <Route path="/Login" element={<Login />} />
            
            <Route path="/ForgotPassword" element={<ForgotPassword />} />
            
            <Route path="/ResetPassword" element={<ResetPassword />} />
            
            <Route path="/Packages" element={<Packages />} />
            
            <Route path="/Settings" element={<Settings />} />
            
            <Route path="/Transport" element={<Transport />} />
            
            <Route path="/TransportBooking" element={<TransportBooking />} />
            
            <Route path="/TripDetail" element={<TripDetail />} />
            
            <Route path="/TripPlanner" element={<TripPlanner />} />
            
        </Routes>
    );
    
    return shouldUseLayout ? (
        <Layout currentPageName={currentPage}>{content}</Layout>
    ) : (
        content
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}