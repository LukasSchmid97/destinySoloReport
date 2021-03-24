import React from 'react'
import Grid from '@material-ui/core/Grid';

import {useParams} from "react-router-dom"

function ActivityDisplay(props){

    let {system, destinyid } = useParams()

    let pgcrdata = props.pgcrData
    //console.log(pgcrdata)

    let activityType = props.type
    //get relevant activites, completed activites and sort by date
    let specificActivities = props.activityList
        .filter(game => props.hashes.includes(game['activityDetails']['directorActivityHash']))
    
    specificActivities = [...new Set(specificActivities)]

    if(activityType === 'raid'){
        //props.image is a banner
    }

    specificActivities = specificActivities.filter(game => {
        let eligible = true
        if (props.filterBy.includes('playerCount')){
            if (activityType === 'raid'){
                //use raid stat
                let mypgcr = pgcrdata[game['activityDetails']['instanceId']]
                if(mypgcr === undefined){
                    eligible &= game['values']['playerCount']['basic']['value'] <= 3
                    //return false
                }else{
                    let playerIDs = new Set(mypgcr['entries'].map(player => player['player']['destinyUserInfo']['membershipId']))
                    eligible &= playerIDs.size <= props.playerCount
                }
            }else{
                //GM or dungeon or secret mission
                eligible &= game['values']['playerCount']['basic']['value'] <= props.playerCount
            }
        }
        
        if (props.filterBy.includes('completionReason')){
            //because activity might have timed out
            eligible &= game['values']['completionReason']['basic']['value'] === 0
        }

        return eligible
    })

    let readableDate = (datestring) => {
        let unixTime = Date.parse(datestring)
        let d = new Date()
        d.setTime(unixTime)
        return d.toDateString()
    }

    let getActivityName = (game) => {
        let activityHash = game['activityDetails']['directorActivityHash']
        let fullName = props.activityDefinition[activityHash]['displayProperties']['name']
        fullName = fullName
            .replace('Nightfall:', '')
            .replace('The Ordeal:', '')
            .replace('Grandmaster:', '')
            .trim()
        return fullName
    }

    let getPlayerCount = (game) => {
        if(pgcrdata[game['activityDetails']['instanceId']] === undefined){
            return "*spinning*"
        }
        let number = (new Set(pgcrdata[game['activityDetails']['instanceId']]['entries'].map(player => player['player']['destinyUserInfo']['membershipId']))).size 
        switch(number){
            case 1:
                return 'Solo'
            case 2:
                return 'Duo with'
            case 3:
                return 'Trio with'
            default:
                return '*spinning*'
        }
    }

    let getPlayerBadgesOrSolo = (game) => {
        let instanceId = game['activityDetails']['instanceId']
        let instanceDetails = pgcrdata[instanceId]
        if(!instanceDetails){
            return null
        }
        let players = instanceDetails['entries'].filter(player => player['player']['destinyUserInfo']['membershipId'] !== String(destinyid))
        return <div>
            {
                players.map(player => <div>
                    <a  target='_blank' 
                        rel="noreferrer" 
                        href={"https://elevatorbot.ch/soloreport/" +
                            player['player']['destinyUserInfo']['membershipType'] + "/" + 
                            player['player']['destinyUserInfo']['membershipId']}>
                        <img style={{height: "0.8em"}} src={'https://www.bungie.net' + player['player']['destinyUserInfo']['iconPath']} alt=''/> {player['player']['destinyUserInfo']['displayName']}
                    </a>
                </div>)
            }
        </div>
    }

    //TODO return nightfall name for gms
    //TODO presage master/normal
    //TODO flawless markers
    //TODO number of people markers/done with
    return (
        <div>
            <h3>{props.sectionTitle}</h3>
            {specificActivities.map(game => (
                <Grid
                container
                direction="row"
                justify="space-evenly"
                alignItems="center"
                key={game['activityDetails']['instanceId']}
                className={game['values']['deaths']['basic']['value'] === 0 && activityType !== 'raid'?'flawless':'flawed'}
              >
                    <Grid item xs={3}><a target="_blank" rel="noreferrer" href={`https://${activityType}.report/pgcr/` + game['activityDetails']['instanceId']}>{readableDate(game['period'])}</a></Grid> 
                    {activityType === 'grandmaster'? <Grid item xs={2}>{getActivityName(game)}</Grid>:null}
                    {activityType === 'raid'? 
                    <Grid item xs={2}>
                        <div>{getPlayerCount(game)}</div><label>{getPlayerBadgesOrSolo(game)}</label>
                    </Grid>
                    :null}
                    <Grid item xs={3}><div className="entryValue">{game['values']['timePlayedSeconds']['basic']['displayValue']}</div><label>Time</label></Grid>
                    <Grid item xs={1}><div className="entryValue">{game['values']['kills']['basic']['value']}</div><label>Kills</label></Grid>
                    <Grid item xs={1}><div className="entryValue">{game['values']['deaths']['basic']['value']}</div><label>Deaths</label></Grid>
                    <Grid item xs={2}><div className="entryValue">{game['values']['efficiency']['basic']['displayValue']}</div><label>K/D</label></Grid>
                </Grid>
            ))}
        </div>
    )
}

export default ActivityDisplay