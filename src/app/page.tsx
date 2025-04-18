import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="flex flex-col items-start gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Koblich Chronicles - your personal stock trading tracker
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Charts</CardTitle>
              <CardDescription>
                View and manage your stock chart collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Browse through your saved stock charts, filter by ticker or tag.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/charts">View Charts</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trades</CardTitle>
              <CardDescription>
                Track your trading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Log and analyze your trades with detailed metrics and statistics.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/trades">Manage Trades</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>
                Review your trading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Get insights into your trading performance with detailed statistics.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/statistics">View Statistics</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
