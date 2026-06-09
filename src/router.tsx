import { createRouter, createRoute, createRootRoute, redirect } from "@tanstack/react-router"
import { RootLayout } from "@/layouts/RootLayout"
import { TasksPage } from "@/pages/TasksPage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { InviteAcceptPage } from "@/pages/InviteAcceptPage"
import { RemindersPage } from "@/pages/RemindersPage"

const isLoggedIn = () => !!localStorage.getItem("auth_token")

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: isLoggedIn() ? "/tasks" : "/login" })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: "/tasks" })
  },
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: "/tasks" })
  },
  component: RegisterPage,
})

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: "/login" })
  },
  component: TasksPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: "/login" })
  },
  component: SettingsPage,
})

const remindersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reminders",
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: "/login" })
  },
  component: RemindersPage,
})

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$token",
  component: InviteAcceptPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  tasksRoute,
  remindersRoute,
  settingsRoute,
  inviteRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
