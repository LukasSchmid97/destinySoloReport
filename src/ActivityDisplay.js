import React from 'react'

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';

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
        
        eligible &= game['values']['kills']['basic']['value'] > 0

        return eligible
    })

    let readableDate = (datestring) => {
        let unixTime = Date.parse(datestring)
        let d = new Date()
        d.setTime(unixTime)
        return d.toLocaleDateString("en-GB")
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
            return <CircularProgress size="1.2em" thickness={5} color='secondary'/>
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
        let players = instanceDetails['entries']
            .filter(player => player['player']['destinyUserInfo']['membershipId'] !== String(destinyid))
            .filter(player => player['values']['completed']['basic']['value'] === 1)
        return <div>
            {
                players.map(player => <div>
                    <Button  
                        target='_blank' 
                        rel="noreferrer" 
                        style={{
                            backgroundColor: "#003c9c",
                            marginTop: "2px"
                        }}
                        href={"https://elevatorbot.ch/soloreport/" +
                            player['player']['destinyUserInfo']['membershipType'] + "/" + 
                            player['player']['destinyUserInfo']['membershipId']}>
                        <img style={{height: "1.2em", marginRight: "0.3em"}} src={'https://www.bungie.net' + player['player']['destinyUserInfo']['iconPath']} alt=''/> {player['player']['destinyUserInfo']['displayName']}
                    </Button>
                </div>)
            }
        </div>
    }

    //TODO presage master/normal
    return (
        <div>
            <h3>{props.sectionTitle}</h3>
            {specificActivities.map(game => (
                <Grid
                container
                direction="row"
                justify="space-between"
                alignItems="center"
                key={game['activityDetails']['instanceId']}
                className={game['values']['deaths']['basic']['value'] === 0 && activityType !== 'raid'?'flawless':'flawed'}
              >
                    <Grid item xs={2}>{readableDate(game['period'])}</Grid>
                    {activityType === 'grandmaster'? <Grid item xs={2}>{getActivityName(game)}</Grid>:null}
                    {activityType === 'raid'? 
                    <Grid item xs={2}>
                        <div>{getPlayerCount(game)}</div><label>{getPlayerBadgesOrSolo(game)}</label>
                    </Grid>
                    :null}
                    <Grid item xs={1} className='hidden-mobile'><div className="entryValue">{game['values']['timePlayedSeconds']['basic']['displayValue']}</div><label>Time</label></Grid>
                    <Grid item xs={1} className='hidden-mobile'><div className="entryValue">{game['values']['kills']['basic']['value']}</div><label>Kills</label></Grid>
                    <Grid item xs={1} className='hidden-mobile'><div className="entryValue">{game['values']['deaths']['basic']['value']}</div><label>Deaths</label></Grid>
                    <Grid item xs={1} className='hidden-mobile'><div className="entryValue">{game['values']['efficiency']['basic']['displayValue']}</div><label>K/D</label></Grid>
                    <Grid item xs={2}><Button target="_blank" rel="noreferrer" className={activityType} href={`https://${activityType}.report/pgcr/` + game['activityDetails']['instanceId']}>{activityType}.report</Button></Grid>
                </Grid>
            ))}
        </div>
    )
}

export default ActivityDisplay