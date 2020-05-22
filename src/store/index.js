import Vue from "vue";
import Vuex from "vuex";
const fb = require("@/firebaseConfig.js");

Vue.use(Vuex);

fb.auth.onAuthStateChanged(firebaseUser => {
  if (firebaseUser) {
    store.commit("setCurrentUser", firebaseUser);
    store.dispatch("fetchUserProfile");

    fb.usersCollection.doc(firebaseUser.uid).onSnapshot(doc => {
      store.commit("setUserProfile", doc.data());
    });

    fb.postsCollection
      .orderBy("createdOn", "desc")
      .onSnapshot(querySnapshot => {
        let createdByCurrentUser;
        if (querySnapshot.docs.length) {
          createdByCurrentUser =
            store.state.currentUser.uid ==
            querySnapshot.docChanges()[0].doc.data().userId
              ? true
              : false;
        }
        if (
          querySnapshot.docChanges().length !== querySnapshot.docs.length &&
          querySnapshot.docChanges()[0].type == "added" &&
          !createdByCurrentUser
        ) {
          let post = querySnapshot.docChanges()[0].doc.data();
          post.id = querySnapshot.docChanges()[0].doc.id;

          store.commit("setHiddenPosts", post);
        } else {
          let postsArray = [];

          querySnapshot.forEach(doc => {
            let post = doc.data();
            post.id = doc.id;
            postsArray.push(post);
          });

          store.commit("setPosts", postsArray);
        }
      });
  }
});

export const store = new Vuex.Store({
  state: {
    currentUser: null,
    userProfile: {},
    posts: [],
    hiddenPosts: []
  },
  mutations: {
    setCurrentUser(state, val) {
      state.currentUser = val;
    },
    setUserProfile(state, val) {
      state.userProfile = val;
    },
    setPosts(state, val) {
      if (val) {
        state.posts = val;
      } else {
        state.posts = [];
      }
    },
    setHiddenPosts(state, val) {
      if (val) {
        if (!state.hiddenPosts.some(x => x.id === val.id)) {
          state.hiddenPosts.unshift(val);
        }
      } else {
        state.hiddenPosts = [];
      }
    }
  },
  actions: {
    clearData({ commit }) {
      commit("setCurrentUser", null);
      commit("setUserProfile", {});
      commit("setPosts", null);
      commit("setHiddenPosts", null);
    },
    fetchUserProfile({ commit, state }) {
      fb.usersCollection
        .doc(state.currentUser.uid)
        .get()
        .then(res => {
          commit("setUserProfile", res.data());
        })
        .catch(err => {
          console.log(err);
        });
    },
    updateProfile({ state }, data) {
      let name = data["name"];
      let title = data.title;

      fb.usersCollection
        .doc(state.currentUser.uid)
        .update({ name: name, title: title })
        .then(() => {
          // update all posts by user to reflect new name
          fb.postsCollection
            .where("userId", "==", state.currentUser.uid)
            .get()
            .then(docs => {
              docs.forEach(doc => {
                fb.postsCollection.doc(doc.id).update({
                  userName: name
                });
              });
            });
          // update all comments by user to reflect new name
          fb.commentsCollection
            .where("userId", "==", state.currentUser.uid)
            .get()
            .then(docs => {
              docs.forEach(doc => {
                fb.commentsCollection.doc(doc.id).update({
                  userName: name
                });
              });
            });
        })
        .catch(err => {
          console.log(err);
        });
    }
  },
  modules: {}
});
