import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"
import { LineChart, ListFilter, BarChart3, ExternalLink, Twitter, Italic } from "lucide-react"
import { FaXTwitter } from 'react-icons/fa6';

export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="flex flex-col items-start gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome to Koblich Chronicles - interactive stock model-book with insights to my personal trading
          </p>
        </div>

        {/* About Me Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Why Koblich?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Well, that's very personal thing that only my closest friends know. But you're getting the hint in the project logo, or simply google the Czech language term "koblih" and create the narrative for yourself.
            </p>
            
            <h3 className="text-xl font-medium mt-4">About Me</h3>
            <p>
              For those who don't know me - my name is Leoš Mikulka - I'm primarily a Swing trader/shorter-term trader heavily influenced by CANSLIM methodology and some of the brightest minds revolving around this style - starting to learn from the whole IBD personnel, via getting solid foundation by Mark Minervini and being fine-cut in my style by Leif Soreide. With the help of these, I have been able to place in the third place &#x1F949; in the United States Investing Championship 2024.
            </p>
            <p className="mt-2">
              Personally, I've always been an avid athlete - playing ice-hockey as a goalie (in Prague's beer league) and a former football player as a CB with national team experience, having a chance to play across multiple European countries and grapping some championship rings in &#x1F1E8;&#x1F1FF; and &#x1F1EC;&#x1F1E7;.
            </p>
            <p className="mt-2">
              I'm from Czech Republic - if anyone wants to visit Prague, get in touch when you're coming and let's have a beer or two together!
            </p>
            
            <h3 className="text-xl font-medium mt-4">What Is This Page?</h3>
            <p>
              The goal is to build up <strong>an interactive model-book that grows in near real-time</strong> - cause "no hindsight trading allowed"!. The entered charts are based primarily on my own trading, but over time I may include other names (such as best performers, or any chart/name that I find interesting in some sense) as each proper model-book should have those.
            </p>
            <p className="mt-2">
              Ultimate goal is to create an extensive model book that the whole trading community may find useful. Who knows... maybe in the future one feature could be an "export" to an actual PDF/book.
            </p>
            
            <h3 className="text-xl font-medium mt-4">What It Is NOT</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Model portfolio or investment advice:</strong> I do not provide watchlists or tell anyone what to buy or sell. The site is purely for educational purposes.
              </li>
              <li>
                <strong>100% of my trades included:</strong> Even though I will be uploading my trades, I will not necessarily include all of them (especially very short term trading around position, day trading, etc.) - the goal is to have a model book, not a website filled with noise of an overly extensive trade log.
              </li>
              <li>
                <strong>Trading platform or educational service:</strong> I am not providing any services, courses or FAQs. As of today, I have not implemented any features that would allow users to build their own model books or enter their own trades. I am still a proud member of ChampionTeamTrading.com - if anyone is looking to join a trading community/education platform - we will be more than happy to see you there!
              </li>
            </ul>
            
            <div className="flex items-center gap-2 mt-4">
              <p>Follow me on:</p>
              <Link href="https://x.com/mikulkal" target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:text-blue-700">
                  <FaXTwitter className="h-4 w-4 mr-1" />
                  @mikulkal
              </Link>
              <p> <em>(or reach out in case of any bug reports, complaints, wishes, or praise)</em></p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* Main Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-3 w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Charts
              </CardTitle>
              <CardDescription>
                Browse the model book and filter charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Browse through the model book, filter by ticker or tag to find specific chart patterns.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/charts">View Charts</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListFilter className="h-5 w-5" />
                Trades
              </CardTitle>
              <CardDescription>
                Track trading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>View trade logs with detailed metrics, and jump to specific charts when needed.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/trades">Manage Trades</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistics
              </CardTitle>
              <CardDescription>
                Review trading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Get insights on trading statistics that can be used to improve performance and strategy.</p>
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