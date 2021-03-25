import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
    textAlign: 'left'
  },
}));

//TODO: login logic

function str_obj(str) {
    str = str.split(', ');
    var result = {};
    for (var i = 0; i < str.length; i++) {
        var cur = str[i].split('=');
        result[cur[0]] = cur[1];
    }
    return result;
}

export default function ButtonAppBar(props) {
    const classes = useStyles();

    let authedUser = str_obj(document.cookie)

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Toolbar>
                <Typography variant="h6" className={classes.title}>
                    Destiny Solo Report
                </Typography>
                {
                    Object.keys(authedUser).includes('name')?
                        <Button variant="contained" color='primary' href={`https://www.elevatorbot.ch/soloreport/${authedUser['system']}/${authedUser['destinyid']}`} ><img style={{height: "0.8em", marginRight: "0.3em"}} src={'https://www.bungie.net' + authedUser['img']} alt=''/>{authedUser['name']}</Button>
                    :
                        <Button color="inherit" href="https://www.bungie.net/en/OAuth/Authorize?client_id=35973&response_type=code">Login</Button>
                }
                </Toolbar>
            </AppBar>
        </div>
    );
}