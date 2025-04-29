"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { LineChart, ListFilter, BarChart3 } from "lucide-react"
import { FaXTwitter } from 'react-icons/fa6'
import { motion } from "framer-motion"

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

export default function Home() {
  return (
    <div className="space-y-8 pb-8">

      {/* Hero Section */}
      <div className="w-full flex flex-col md:flex-row items-stretch justify-center gap-6">
        <div className="flex-shrink-0">
          <Image
            src="/logo2.png"
            alt="Koblich Chronicles Logo"
            width={200}
            height={200}
            className="rounded-xl shadow-lg"
          />
        </div>
        <section className="rounded-xl flex justify-center overflow-hidden shadow-lg animate-fade-in-up w-full md:w-auto" style={{ backgroundColor: "#bec5c6" }}>
          <div className="py-8 px-6 flex flex-col justify-center h-full">
            <motion.div
              className="flex flex-col items-center md:items-start text-center md:text-left"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4" style={{ fontFamily: "'Manrope', 'Inter'" }}>
                Koblich Chronicles
              </h1>
              <p className="text-xl text-gray-700" style={{ fontFamily: "'Manrope', 'Inter'" }}>
                Interactive stock model-book with insights to single trades
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Feature Cards */}
      <motion.div
        className="grid gap-6 md:grid-cols-3 mt-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {[
          { icon: LineChart, title: 'Charts', desc: 'Browse through the model book, filter by ticker or tag to find specific chart patterns.', href: '/charts', color: 'blue' },
          { icon: ListFilter, title: 'Trades', desc: 'View trade logs with detailed metrics, and jump to specific charts when needed.', href: '/trades', color: 'green' },
          { icon: BarChart3, title: 'Statistics', desc: 'Get insights on trading statistics that can be used to improve performance and strategy.', href: '/statistics', color: 'purple' }
        ].map(({ icon: Icon, title, desc, href, color }) => (
          <motion.div
            key={title}
            variants={fadeIn}
            whileHover={{
              y: -10,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="h-full shadow-md">
              <CardContent className="p-5 flex flex-col h-full">
                <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <h3 className="text-lg font-medium mb-2">{title}</h3>
                <p className="text-gray-600 mb-4 flex-grow text-sm">{desc}</p>
                <Button asChild className="mt-auto w-full">
                  <Link href={href}>View {title}</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* About Me */}
        <motion.div variants={fadeIn}>
          <Card className="overflow-hidden shadow-md p-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
          <CardContent className=" rounded-lg">
            <h2 className="text-xl font-medium mb-4 text-gray-800" style={{ fontFamily: "'Manrope', 'Inter'" }}>
              About me
            </h2>
            <p className="mb-4 text-md text-gray-700" style={{ fontFamily: "'Manrope', 'Inter'" }}>
              For those who don't know me – my name is Leoš Mikulka – I'm primarily a Swing trader/shorter-term trader heavily influenced by the CANSLIM methodology and some of the brightest minds revolving around this style. I have learned a lot from the Investors Business Daily, gotten a solid foundation from Mark Minervini and been fine-tuned in my style by Leif Soreide. All of these factors helped me place third 🥉 in the 2024 United States Investing Championship.
            </p>
            <p className="mb-4 text-md text-gray-700" style={{ fontFamily: "'Manrope', 'Inter'" }}>
              Personally, I've always been an avid athlete – currently playing ice-hockey as a goalie and competed as a football player (cornerback) for the national team, having a chance to play across multiple European countries and grabbing some championship rings in 🇨🇿 and 🇬🇧.
            </p>
            <p className="text-md text-gray-700" style={{ fontFamily: "'Manrope', 'Inter'" }}>
              I'm from the Czech Republic – if anyone wants to visit Prague, feel free to get in touch when you're coming and let's have a beer or two together!
            </p>
          </CardContent>
          </Card>
        </motion.div>

        {/* What Is This Page */}
        <motion.div variants={fadeIn}>
          <Card className="shadow-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-medium mb-4 text-gray-800">What Is This Page?</h2>
              <p className="mb-4">
                  The goal is to build up <strong>an interactive model-book that grows in near real-time</strong> - cause "no hindsight trading allowed"!. The entered charts are based primarily on my own trading, but over time I may include other names (such as best performers, or any chart/name that I find interesting in some sense) as each proper model-book should have those.
                </p>
                <p>
                  The ultimate goal is to create an extensive model book that the whole trading community may find useful. Who knows... maybe in the future one feature could be an "export" to an actual PDF/book.
                </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* What It Is NOT */}
        <motion.div variants={fadeIn}>
          <Card className="shadow-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-medium mb-4 text-gray-800">What It Is NOT</h2>
              <ul className="space-y-4">
              <li className="flex gap-3">
                  <div className="bg-red-100 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold">•</span>
                  </div>
                  <div>
                    <strong>Model portfolio or investment advice:</strong> I do not provide watchlists or tell anyone what to buy or sell. The site is purely for educational purposes.  I am not responsible for any financial losses or outcomes resulting from the use of information provided on this site. By using this site, you agree to assume full responsibility for your investment decisions and acknowledge that you bear sole liability for any resulting financial outcomes.
You, as the user, agree to hold me harmless from any claims, damages, or losses arising from your use of the information provided on this site. This disclaimer applies to all content, regardless of format or medium.
Past performance is not indicative of future results. Markets change constantly, and all investors must exercise their own judgment when making investment decisions.
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="bg-red-100 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold">•</span>
                  </div>
                  <div>
                    <strong>100% of my trades included:</strong> Even though I will be uploading my trades, I will not necessarily include all of them (especially very short term trading around position, day trading, etc.) - the goal is to have a model book, not a website filled with noise of an overly extensive trade log.
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="bg-red-100 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold">•</span>
                  </div>
                  <div>
                    <strong>Trading platform or educational service:</strong> I am not providing any services, courses or FAQs. As of today, I have not implemented any features that would allow users to build their own model books or enter their own trades. I am still a proud member of ChampionTeamTrading.com - if anyone is looking to join a trading community/education platform - we will be more than happy to see you there!
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connect & Support */}
        <motion.div variants={fadeIn}>
          <Card className="shadow-md shadow-md p-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <h2 className="text-xl font-medium mb-4 text-gray-800">Connect & Support</h2>
              <div className="flex items-center gap-2 mb-4">
                <p className="font-medium">Follow me on:</p>
                <Link href="https://x.com/mikulkal" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-primary/80 transition-colors">
                  <FaXTwitter className="h-4 w-4 mr-1" />
                  <span>@mikulkal</span>
                </Link>
                <small><em>(or reach out in case of any bug reports, complaints, wishes, or praise)</em></small>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  Maintaining Koblich Chronicles requires significant time (and as we all know - time = money), plus small hosting and infrastructure costs. If you’re finding value here, your donations can help keep this project alive.
                </p>
                <p>
                I may introduce premium features down the road, but for now, I hope these resources give you an edge. If I can contribute to improving your trading by even 0.1%, I'm more than happy — it makes it all worthwhile!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
