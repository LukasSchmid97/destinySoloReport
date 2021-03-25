import "./App.css"

import ButtonAppBar from "./ButtonAppBar"
import ProfileInfoCard from "./ProfileInfoCard"
import ActivityDisplay from "./ActivityDisplay"

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  createMuiTheme,
  ThemeProvider
} from "@material-ui/core"

import Typography from "@material-ui/core/Typography"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"

import React, { useState, useEffect } from "react"

import {
  Switch,
  Route,
  useParams,
  useLocation,
  useHistory
} from "react-router-dom"
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory({
    basename: process.env.PUBLIC_URL
}); //necessary for react router on subpages

const apiRoot = "https://www.bungie.net/Platform"

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});

function getHeader() {
  return { "X-API-Key": "f17e9079050f49cf8bd50a6893293fcd" }
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function App() {
  let history = useHistory()

  let query = useQuery();
  let bungieCode = query.get('code')

  if(!!bungieCode){
    fetch("https://www.bungie.net/Platform/App/OAuth/Token/",
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${bungieCode}&client_id=35973`
    }).then(
      data => data.json()
    ).then(
      authResponse =>
      fetch("https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
      {
        'method':'GET',
        headers: { 
          'X-API-Key': '20cd436d810c4305af4278b6b3b84a6b',
          'Authorization': `Bearer ${authResponse['access_token']}`
        },
      }).then(
        data => data.json()
      ).then(
        data => {
          let memberships = data['Response']['destinyMemberships']
          let main = memberships.find(membership => membership['membershipId'] === data['Response']['primaryMembershipId'])
          document.cookie = JSON.stringify({ 
            'name': main['displayName'],
            'system': main['membershipType'],
            'destinyid': main['membershipId'],
            'img': main['iconPath']
          })
          history.push(`/soloreport/${main['membershipType']}/${main['membershipId']}`)
        }
      )
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        <header className="App-header"></header>
        <ButtonAppBar/>
        <Switch>
          <Route
            path="/soloreport/:system/:destinyid"
            children={
              <InfoPage className="flexContainer" key="theOnlyInfoPage" />
            }
          />
        </Switch>
      </div>
    </ThemeProvider>
  )
}

function InfoPage() {
  // We can use the `useParams` hook here to access
  // the dynamic pieces of the URL.
  
  let {system, destinyid } = useParams()

  const [accountinfo, setAccountinfo] = useState({
    maxpower: 0,
    name: "",
    emblempath: "",
  })
  const [loadingprofile, setLoadingprofile] = useState(true)
  const [characterIDs, setCharacterIDs] = useState([])
  const [pastGames, setPastGames] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [gmkeys, setGMkeys] = useState([])
  const [raids, setRaids] = useState([])
  const [destinyActivityDefinition, setDestinyActivityDefinition] = useState({})
  const [pgcrdata, setPgcrdata] = useState({})
  let systemid = -1

  switch (system) {
    case "pc":
      systemid = 3
      break
    case "ps":
      systemid = 2
      break
    case "xb":
      systemid = 1
      break
    case "stadia":
      systemid = 5
      break
    default:
      systemid = system
  }

  useEffect(() => {
    const profileURL = `/Destiny2/${systemid}/Profile/${destinyid}/?components=100,200`
    fetch(apiRoot + profileURL, {
      method: "get",
      headers: new Headers(getHeader()),
    })
      .then((data) => data.json())
      .then((response) => {
        let userInfo = response["Response"]["profile"]["data"]["userInfo"]
        let displayName = userInfo["displayName"]

        let charactersinfo = response["Response"]["characters"]["data"]
        let lightlevels = Object.keys(charactersinfo).map(
          (characterid) => charactersinfo[characterid]["light"]
        )
        let maxPower = Math.max(...lightlevels)

        setCharacterIDs(Object.keys(charactersinfo))

        let mostplayedid = Object.keys(charactersinfo).sort(
          (firstEl, secondEl) =>
            charactersinfo[secondEl]["minutesPlayedTotal"] -
            charactersinfo[firstEl]["minutesPlayedTotal"]
        )[0]
        let emblempath = charactersinfo[mostplayedid]["emblemPath"]
        //"/common/destiny2_content/icons/2eec5dc07d45c6e9c3aa75d20dd1a4c6.jpg"
        setAccountinfo({
          maxpower: maxPower,
          name: displayName,
          emblempath: emblempath,
        })
        setLoadingprofile(false)
        document.title = `${displayName} - Solo Report` //set users ingame name
      })

    let manifestURL = "https://www.bungie.net/Platform/Destiny2/Manifest/"
    fetch(manifestURL)
      .then((data) => data.json())
      .then((manifest) => {
        let dadURL =
          manifest["Response"]["jsonWorldComponentContentPaths"]["en"][
            "DestinyActivityDefinition"
          ]
        fetch("https://stats.bungie.net" + dadURL)
          .then((data) => data.json())
          .then((activityDefiniton) => {
            let activitykeys = Object.keys(activityDefiniton)
            let gms = activitykeys.filter((key) => {
              if (!Object.keys(activityDefiniton[key]).includes("modifiers")) {
                return false
              }
              //extract activities with the 'grandmaster' modifier
              return activityDefiniton[key]["modifiers"].some(
                (modifier) => modifier["activityModifierHash"] === 2265680717
              )
            })
            setGMkeys(gms.map((stringkey) => parseInt(stringkey)))
            let raidKeys = activitykeys.filter((key) => {
              return activityDefiniton[key]["activityTypeHash"] === 2043403989 //raid
            })
            setRaids(raidKeys.map((key) => activityDefiniton[key]))
            setDestinyActivityDefinition(activityDefiniton)
          })
      })
  }, [systemid, destinyid])

  function getCharacterActivities(
    sysid,
    destinyid,
    charid,
    basePage,
    parallels
  ) {
    const historyPerCharURL = `/Destiny2/${systemid}/Account/${destinyid}/Character/${charid}/Stats/Activities/?mode=7&count=250&page=`
    Promise.all(
      parallels.map((curPage) =>
        fetch(apiRoot + historyPerCharURL + (curPage + basePage), {
          method: "get",
          headers: new Headers(getHeader()),
        })
      )
    )
      .then((respList) => Promise.all(respList.map((resp) => resp.json())))
      .then((jsonList) => {
        let done = jsonList.map((response) => {
          if (Object.keys(response["Response"]).includes("activities")) {
            let cleanedGames = response["Response"]["activities"]
              .filter(
                (game) => game["values"]["completed"]["basic"]["value"] === 1
              )
              .filter(
                (game) => game["values"]["playerCount"]["basic"]["value"] < 6
              )
            setPastGames((state, _) => [...state, ...cleanedGames])
            return false
          } else {
            return true
          }
        })
        if (!done.some((bool) => bool)) {
          //if all return data, get more data
          getCharacterActivities(
            sysid,
            destinyid,
            charid,
            basePage + parallels.length,
            parallels
          )
        } else {
          setPastGames((state, _) => {
            let orderedState = state.sort(
              (a, b) => Date.parse(b["period"]) - Date.parse(a["period"])
            )
            return [...new Set(orderedState)]
          })
          //only keep unique activities
          setLoadingActivities(false)
        }
      })
  }

  const pgcrURL = (activityid) =>
    `https://stats.bungie.net/Platform/Destiny2/Stats/PostGameCarnageReport/${activityid}/`
  useEffect(() => {
    let raidActivities = pastGames.filter(
      (game) => game["activityDetails"]["mode"] === 4
    )
    raidActivities.forEach((game) => {
      let pgcrid = game["activityDetails"]["instanceId"]
      let pgcrlink = pgcrURL(pgcrid)
        fetch(pgcrlink, {
          method: "get",
          headers: new Headers({
            "X-API-Key": "f17e9079050f49cf8bd50a6893293fcd",
          }),
        })
          .then((data) => data.json())
          .then((pgcr) => {
            //check if instance is lowman
            if (
              new Set(
                pgcr["Response"]["entries"].map(
                  (player) =>
                    player["player"]["destinyUserInfo"]["membershipId"]
                )
              ).size <= 3
            ) {
              setPgcrdata((state, _) => ({ [pgcrid]: pgcr["Response"], ...state }))
              //TODO write PGCRs to DB and read from there + update
            }
          })
      })
  }, [pastGames])

  useEffect(() => {
    if (characterIDs.length > 0) {
      //console.log(characterIDs)
      characterIDs.forEach((charid) => {
        let basePage = 0
        let parallels = [0, 1, 2, 3, 4]
        getCharacterActivities(
          systemid,
          destinyid,
          charid,
          basePage,
          parallels
        )
      })
    }
  }, [characterIDs, destinyid, systemid])

  //dungeons are easy since you can't swap character (unique destinyIDs) in there nor time out (completionReason)

  //  /Destiny2/Stats/PostGameCarnageReport/{activityId}/ //PGCR
  let raidDetails = []
  raids.forEach((raid) => {
    //accounting for Last Wish: Level 55 etc.
    if (
      raidDetails
        .map((rd) => rd["name"])
        .includes(raid["displayProperties"]["name"]) ||
      raidDetails
        .map((rd) => rd["name"])
        .includes(raid["displayProperties"]["name"].split(":")[0])
    ) {
      raidDetails.forEach((rd) => {
        if (
          rd["name"] === raid["displayProperties"]["name"] ||
          rd["name"] === raid["displayProperties"]["name"].split(":")[0]
        ) {
          rd["hashes"].push(raid["hash"])
        }
      })
    } else {
      raidDetails.push({
        name: raid["displayProperties"]["name"].split(":")[0],
        hashes: [raid["hash"]],
        pgcrImage: [raid["pgcrImage"]],
      })
    }
  })
  return (
    <div>
      <ProfileInfoCard
        loadingProfile={loadingprofile}
        accountinfo={accountinfo}
      />
      <div className="accordions">
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Dungeons</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container direction="column">
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Shattered Throne"
                type="dungeon"
                filterBy={["playerCount"]}
                playerCount={1}
                hashes={[1893059148, 2032534090]}
              />
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Pit of Heresy"
                type="dungeon"
                filterBy={["playerCount"]}
                playerCount={1}
                hashes={[1375089621, 2582501063]}
              />
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Prophecy"
                type="dungeon"
                filterBy={["playerCount"]}
                playerCount={1}
                hashes={[4148187374, 1077850348]}
              />
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Story Missions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container direction="column">
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Presage"
                type="dungeon"
                filterBy={["playerCount", "completionReason"]}
                playerCount={1}
                hashes={[2124066889]}
              />
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Presage: Master"
                type="dungeon"
                filterBy={["playerCount", "completionReason"]}
                playerCount={1}
                hashes={[4212753278]}
              />
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Harbinger"
                type="dungeon"
                filterBy={["playerCount", "completionReason"]}
                playerCount={1}
                hashes={[1738383283]}
              />
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Grand Master Nightfall</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container direction="column">
              <ActivityDisplay
                activityList={pastGames}
                sectionTitle="Grand Master Nightfall"
                type="grandmaster"
                filterBy={["playerCount", "completionReason"]}
                playerCount={1}
                hashes={gmkeys}
                activityDefinition={destinyActivityDefinition}
              />
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Raids</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container direction="column">
              {loadingActivities
                ? "Loading..."
                : raidDetails.map((raid) => {
                    return (
                      <ActivityDisplay
                        activityList={pastGames}
                        pgcrData={pgcrdata}
                        sectionTitle={raid["name"]}
                        type="raid"
                        filterBy={["playerCount", "completionReason"]}
                        playerCount={3}
                        hashes={raid["hashes"]}
                        image={raid["pgcrImage"]}
                      />
                    )
                  })}
              {raidDetails.length === 0
                ? "DestinyActivityDefinition failed to load"
                : null}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  )
}

export default App
