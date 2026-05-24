import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { UserDashboard } from "./pages/UserDashboard";
import { ApplicationDashboard } from "./pages/ApplicationDashboard";
import { AnomalyDetectionPage } from "./pages/AnomalyDetectionPage";
import { AnomalyFlagsPage } from "./pages/AnomalyFlagsPage";
import { RootCauseAnalysisPage } from "./pages/RootCauseAnalysisPage";
import { TestCycleComparisonPage } from "./pages/TestCycleComparisonPage";
import { AutomatedTestingPage } from "./pages/AutomatedTestingPage";
import { OnboardingPage } from "./components/OnboardingPage";
import { ChatbotPage } from "./components/ChatbotPage";
import { SetupTestingEnvironmentPage } from "./pages/SetupTestingEnvironmentPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/setup-testing-environment",
    element: <SetupTestingEnvironmentPage />,
  },
  {
    path: "/dashboard",
    element: <UserDashboard />,
  },
  {
    path: "/application/:appId",
    element: <ApplicationDashboard />,
  },
  {
    path: "/anomaly-detection/:appId",
    element: <AnomalyDetectionPage />,
  },
  {
    path: "/anomaly-flags/:appId/:configId/:anomalyId/root-cause",
    element: <RootCauseAnalysisPage />,
  },
  {
    path: "/anomaly-flags/:appId/:configId",
    element: <AnomalyFlagsPage />,
  },
  {
    path: "/test-cycle-comparison/:appId",
    element: <TestCycleComparisonPage />,
  },
  {
    path: "/automated-testing/:appId",
    element: <AutomatedTestingPage />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },
  {
    path: "/onboarding/:appId/:phase",
    element: <OnboardingPage />,
  },
  {
    path: "/chatbot/:appId",
    element: <ChatbotPage />,
  },
]);