
import React from 'react';
import { StyleSheet, Text, Vibration, View, ToastAndroid } from 'react-native';
import { backend_address, setUserActiveTask, userStopTask, userStartTask } from 'big-project-common';
import AppStyles from '../styles';
import { Snackbar } from 'react-native-paper';
import { AuthCheck, useFirestore, useFirestoreCollectionData, useFirestoreDocData, useUser } from 'reactfire';
import FloatingActionButton from '../components/FloatingActionButton';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Moment from 'react-moment';
import { TrackTaskButton } from '../components/TrackTaskButton'
import LoadingScreen from './loadingscreen';
export const IndexPage = (props) => {
    return (
        <AuthCheck fallback={<LoadingScreen />}>
            <MainTaskList {...props} />
        </AuthCheck>
    )
}
const MainTaskList = props => {
    const MIN_TASK_TIME = 5; // seconds
    const [visible, setVisible] = React.useState(false);
    const onToggleSnackBar = () => setVisible(true);
    const onDismissSnackBar = () => setVisible(false);
    const db = useFirestore();
    const { data: user } = useUser();
    const userDetailsRef = user != null ? db.collection('users')
        .doc(user.uid) : null;
    const { data: userDetails } = useFirestoreDocData(userDetailsRef ?? db.collection('users').doc());
    const { data: tasks } = useFirestoreCollectionData(db.collection("tasks").where("user", "==", userDetailsRef), {
        idField: 'id'
    });
    const addTask = () => {
        props.navigation.navigate('New Task');
    }
    const editTask = item => {
        Haptics.selectionAsync();
        props.navigation.navigate('Edit Task', { item_id: item.id });
    }
    const active_task = userDetails?.active_task;
    const askTaskProgress = (task) => {
        db.collection('tasks').doc(task.id).get().then((task_data) => {
            if (!task_data.exists) {
                return;
            }
            const data = task_data.data();
            console.log(data.track_progress);
        });
    }
    const setActiveTask = item_id => {
        const previous_active_task = active_task;
        const taskStopped = setUserActiveTask(userDetails, userDetailsRef, item_id, db, active_task);
        if((Date.now() / 1000) - userDetails.last_task_set_time < MIN_TASK_TIME && userDetails?.is_tracking_task){
            if (Platform.OS === 'android') {
                ToastAndroid.show("Tracked task has been switched", ToastAndroid.SHORT);
            } else if (Platform.OS === 'ios') {
                onToggleSnackBar()
            }
        }
        // TODO: ask progress
        if (taskStopped) {
            console.log("asking progress...")
            askTaskProgress(previous_active_task)
        }
    }
    const trackTaskPressed = () => {
        // TODO: handle return values from these
        if (userDetails?.is_tracking_task) {
            const { taskStopped } = userStopTask(db, active_task, userDetails, userDetailsRef);
            console.log("asking progress...")
            askTaskProgress(active_task)

        } else {
            userStartTask(db, userDetailsRef);
        }
    }
    return (
        <View style={AppStyles.container}>
            <ScrollView>
                {tasks ? tasks.map((item) => {
                    var taskClasses = [styles.tasks,]
                    if (item.id === active_task?.id) {
                        taskClasses.push(styles.activeTask)
                    }
                return (
                    <TouchableOpacity key={item.id} onLongPress={() => editTask(item)} onPress={() => setActiveTask(item.id)}>
                        <Text style={taskClasses} >{item.name}{' \t'}{item.duration + '/' + item.estimated_time}{' hrs \t'}{item.percentage}{'% \n'}{<Moment format="DD MMMM YYYY" date={item.due_date} element={Text} unix />}</Text>
                    </TouchableOpacity>
                );
            }) : <Text>No data</Text>}
            </ScrollView>
                {active_task != undefined && (
            <TrackTaskButton onPress={trackTaskPressed} task={active_task} isTracking={!!(userDetails?.is_tracking_task)} navigation={props.navigation} />
                )}
                <Snackbar style={styles.iosSnackbar}
                    visible={visible}
                    onDismiss={onDismissSnackBar}
                    duration={Snackbar.DURATION_SHORT}
                    theme={{ colors: { surface: 'black' }}}>
                    Tracked task has been switched
                </Snackbar>
            <FloatingActionButton style={styles.floatinBtn} onPress={() => addTask()} />
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
        width: 250,
        position: 'absolute',
        bottom: 0,
        elevation: 1,
        alignSelf: 'center',
    }
});

