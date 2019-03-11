const state = {
  token: null,
  folderId: null
}

const mutations = {
  SET_TOKEN (state, token) {
    state.token = token
  },
  SET_FOLDER_ID (state, folderId) {
    state.folderId = folderId
  }
}

const actions = {
  setToken ({commit}, token) {
    commit('SET_TOKEN', token)
  },
  setFolderId ({commit}, folderId) {
    commit('SET_FOLDER_ID', folderId)
  }
}

export default {
  state,
  mutations,
  actions
}
