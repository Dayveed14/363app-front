import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import LoginVerify from "./pages/LoginVerify";
import Dashboard from "./pages/Dashboard";
import Kyc from "./pages/Kyc";
import Deposit from "./pages/Deposit";
import DepositCallback from "./pages/DepositCallback";
import Withdraw from "./pages/Withdraw";
import BusinessFinanceFacility from "./pages/BusinessFinanceFacility";
import Transactions from "./pages/Transactions";
import Profile from "./pages/Profile";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminFinanceFacilities from "./pages/admin/AdminFinanceFacilities";
import AdminFinanceFacilityDetail from "./pages/admin/AdminFinanceFacilityDetail";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/verify-otp" element={<LoginVerify />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          {/* Paystack redirects here after checkout — outside AppLayout since
              it doesn't need the sidebar and must work mid-flow. */}
          <Route path="/deposit/callback" element={<DepositCallback />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/finance-facility" element={<BusinessFinanceFacility />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/kyc" element={<AdminKyc />} />
            <Route path="/admin/deposits" element={<AdminDeposits />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/admin/finance-facilities" element={<AdminFinanceFacilities />} />
            <Route path="/admin/finance-facilities/:id" element={<AdminFinanceFacilityDetail />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
