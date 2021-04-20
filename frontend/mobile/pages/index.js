
import React from 'react';
import { StyleSheet, Text, Vibration, View, ToastAndroid, Button } from 'react-native';
import { backend_address, setUserActiveTask, userStopTask, userStartTask, MIN_TASK_TIME } from 'big-project-common';
import AppStyles from '../styles';
import { Snackbar } from 'react-native-paper';
import { AuthCheck, useFirestore, useFirestoreCollectionData, useFirestoreDocData, useUser, useAuth } from 'reactfire';
import FloatingActionButton from '../components/FloatingActionButton';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Moment from 'react-moment';
import { TrackTaskButton } from '../components/TrackTaskButton'
import LoadingScreen from './loadingscreen';
import Dialog from "react-native-dialog";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const IndexPage = (props) => {
    return (
        <AuthCheck fallback={<LoadingScreen />}>
            <MainTaskList {...props} />
        </AuthCheck>
    )
}
const MainTaskList = props => {
    const [pass, changePass] = React.useState("");
    const [badPass, changeBadPass] = React.useState(false);
    const [visible, setVisible] = React.useState(false);
    const onToggleSnackBar = () => setVisible(true);
    const onDismissSnackBar = () => setVisible(false);
    const firebase = require('firebase'); 
    const db = useFirestore();
    const { data: user } = useUser();
    const userDetailsRef = user != null ? db.collection('users')
        .doc(user.uid) : null;
    const { data: userDetails } = useFirestoreDocData(userDetailsRef ?? db.collection('users').doc());
    const { data: tasks } = useFirestoreCollectionData(db.collection("tasks").where("user", "==", userDetailsRef), {
        idField: 'id'
    });
    const [open, setOpen] = React.useState(false);
    const handleDeleteOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };
    const dismissSnackbar = () => {
        changeBadPass(false)
        onDismissSnackBar()
    }
    const deleteAccount = () => {
        var credential = firebase.auth.EmailAuthProvider.credential(
            user.email, 
            pass
        );
        console.log(credential)
        user.reauthenticateWithCredential(credential).then(() => {
        user.delete()
        }).catch(() => {
            console.log('bad')
            changeBadPass(true)
            onToggleSnackBar()
        });
    }
    const addTask = () => {
        props.navigation.navigate('New Task');
    }
    const editTask = item => {
        Haptics.selectionAsync();
        props.navigation.navigate('Edit Task', { item_id: item.id });
    }
    const active_task = userDetails?.active_task;
    const setActiveTask = item_id => {
        setUserActiveTask(userDetails, userDetailsRef, item_id, db, active_task);
        if((Date.now() / 1000) - userDetails.last_task_set_time < MIN_TASK_TIME && userDetails?.is_tracking_task){
            if (Platform.OS === 'android') {
                ToastAndroid.show("Tracked task has been switched", ToastAndroid.SHORT);
            } else if (Platform.OS === 'ios') {
                onToggleSnackBar()
            }
        }
    }
    const trackTaskPressed = () => {
        // TODO: handle return values from these
        if (userDetails?.is_tracking_task) {
            userStopTask(db, active_task, userDetails, userDetailsRef);
        } else {
            userStartTask(db, userDetailsRef);
        }
    }
    return (
        <View style={AppStyles.container}>
            <ScrollView>
                {tasks != undefined && tasks.length != 0 ? tasks.map((item) => {
                    var taskClasses = [styles.tasks,]
                    if (item.id === active_task?.id) {
                        taskClasses.push(styles.activeTask)
                    }
                return (
                    <TouchableOpacity key={item.id} onLongPress={() => editTask(item)} onPress={() => setActiveTask(item.id)}>
                        <Text style={taskClasses} >{item.name}{' \t'}{item.duration + '/' + item.estimated_time}{' hrs \t'}{item.percentage}{'% \n'}{<Moment format="DD MMMM YYYY" date={item.due_date} element={Text} unix />}</Text>
                    </TouchableOpacity>
                );
            }) : <Text>You don't have any tasks!</Text>}
            </ScrollView>
                {active_task != undefined && (
            <TrackTaskButton onPress={trackTaskPressed} task={active_task} isTracking={!!(userDetails?.is_tracking_task)} navigation={props.navigation} />
                )}
                <Snackbar style={styles.iosSnackbar}
                    visible={visible}
                    onDismiss={dismissSnackbar}
                    duration={Snackbar.DURATION_SHORT}
                    theme={{ colors: { surface: 'black' }}}>
                    {badPass ? "Incorrect password" : "Tracked task has been switched"}
                </Snackbar>
            <FloatingActionButton style={styles.floatinBtn} onPress={() => addTask()} />
            <View>
                    <Button title={"Delete Account"} onPress={() => handleDeleteOpen()} color={"red"} />
                    <Dialog.Container
                        visible={open}
                        TransitionComponent={Transition}
                        keepMounted
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-slide-title"
                        aria-describedby="alert-dialog-slide-description"
                        >
                        <Dialog.Title id="alert-dialog-slide-title">{"Delete Account?"}</Dialog.Title>
                        <Dialog.Description id="alert-dialog-slide-description">
                            Are you sure you want to delete your account? If so, enter your password and click Agree. This can't be undone!
                        </Dialog.Description>
                        <Dialog.Input placeholder="Password" autoCompleteType="password" onChangeText={changePass} secureTextEntry={true}></Dialog.Input>
                        <Dialog.Button onPress={handleClose} color="red" label="Disagree">
                        Disagree
                        </Dialog.Button>
                        <Dialog.Button onPress={deleteAccount} color="green" label="Agree">
                        Agree
                        </Dialog.Button>
                    </Dialog.Container>
                </View>
        </View>
    );
}
const styles = StyleSheet.create({
    floatinBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        elevation: 5
    },
    tasks:{
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'black',
        color: 'black',
        fontSize: 15,
        textAlign: 'center',
        margin: 4,
    },
    activeTask: {
        borderColor: '#05FF1E',
        borderWidth: 4,
        margin: 2,
    },
    iosSnackbar: {
        backgroundColor: 'white',
        width: 165,
        position: 'absolute',
        bottom: 0,
        elevation: 1,
        alignSelf: 'center'
    }
});

