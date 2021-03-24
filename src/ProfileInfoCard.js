import React from 'react'

function ProfileInfoCard(props){
    let accountinfo = props.accountinfo
    let loadingprofile = props.loadingprofile
    return (
        <div>
            {loadingprofile ? <div>spinner</div> : <div className='item profile'><img src={'https://www.bungie.net' + accountinfo['emblempath']} alt='emblem'/> {accountinfo['name']} {accountinfo['maxpower']} </div>}
        </div>
    )
}

export default ProfileInfoCard