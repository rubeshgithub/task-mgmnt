import { Outlet } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/toaster"

export function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}
