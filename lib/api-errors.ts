export const API_ERROR = {
   INVALID_NAME: "INVALID_NAME",
   USERNAME_CHECK_FAILED: "USERNAME_CHECK_FAILED",
   DASHBOARD_LOAD_FAILED: "DASHBOARD_LOAD_FAILED",
   ROOM_OPEN_FAILED: "ROOM_OPEN_FAILED",
   PARTICIPANT_ADD_FAILED: "PARTICIPANT_ADD_FAILED",
   VOTING_OPEN_FAILED: "VOTING_OPEN_FAILED",
   VOTING_CLOSE_FAILED: "VOTING_CLOSE_FAILED",
   ROOM_DELETE_FAILED: "ROOM_DELETE_FAILED",
   ROOM_SEARCH_FAILED: "ROOM_SEARCH_FAILED",
   ROOM_JOIN_FAILED: "ROOM_JOIN_FAILED",
   VOTE_SAVE_FAILED: "VOTE_SAVE_FAILED",
   RESULTS_LOAD_FAILED: "RESULTS_LOAD_FAILED",
   INVALID_SESSION: "INVALID_SESSION",
   AUTH_REQUIRED_CREATE: "AUTH_REQUIRED_CREATE",
   INCOMPLETE_DATA: "INCOMPLETE_DATA",
   ROOM_LIMITS_EXCEEDED: "ROOM_LIMITS_EXCEEDED",
   INVALID_QUEEN_PHOTO: "INVALID_QUEEN_PHOTO",
   ROOM_CREATE_FAILED: "ROOM_CREATE_FAILED",
   INVALID_INVITATION: "INVALID_INVITATION",
   ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
   ACCOUNT_ALREADY_VOTED: "ACCOUNT_ALREADY_VOTED",
   ACCOUNT_HAS_INVITATION: "ACCOUNT_HAS_INVITATION",
   ACCOUNT_INVITATION_CONFLICT: "ACCOUNT_INVITATION_CONFLICT",
   INVITATION_OTHER_ACCOUNT: "INVITATION_OTHER_ACCOUNT",
   INVALID_ADMIN_LINK: "INVALID_ADMIN_LINK",
   VOTING_NOT_OPEN: "VOTING_NOT_OPEN",
   VOTE_REQUIRED_TO_CLOSE: "VOTE_REQUIRED_TO_CLOSE",
   PUBLISHED_ROOM_DELETE_FORBIDDEN: "PUBLISHED_ROOM_DELETE_FORBIDDEN",
   VOTING_CLOSED: "VOTING_CLOSED",
   PUBLIC_MEMBERS_USE_GLOBAL_LINK: "PUBLIC_MEMBERS_USE_GLOBAL_LINK",
   PARTICIPANT_LIMIT_REACHED: "PARTICIPANT_LIMIT_REACHED",
   PUBLIC_ROOM_NOT_FOUND: "PUBLIC_ROOM_NOT_FOUND",
   MEMBER_ACCOUNT_REQUIRED: "MEMBER_ACCOUNT_REQUIRED",
   ACCOUNT_ALREADY_PARTICIPATED: "ACCOUNT_ALREADY_PARTICIPATED",
   INVITATION_ALREADY_USED: "INVITATION_ALREADY_USED",
   INVALID_RANKING: "INVALID_RANKING",
   INVALID_VOTE: "INVALID_VOTE",
   INVALID_REQUEST: "INVALID_REQUEST",
   INVALID_LINK: "INVALID_LINK",
   RESULTS_NOT_PUBLISHED: "RESULTS_NOT_PUBLISHED",
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];

const messages: Record<"es" | "en", Record<ApiErrorCode, string>> = {
   es: {
      INVALID_NAME: "Introduce un nombre válido",
      USERNAME_CHECK_FAILED: "No se pudo comprobar el nombre de usuario",
      DASHBOARD_LOAD_FAILED: "No se pudieron cargar las salas",
      ROOM_OPEN_FAILED: "No se pudo abrir la sala",
      PARTICIPANT_ADD_FAILED: "No se pudo añadir la participante",
      VOTING_OPEN_FAILED: "No se pudo abrir la votación",
      VOTING_CLOSE_FAILED: "No se pudo cerrar la votación",
      ROOM_DELETE_FAILED: "No se pudo eliminar la sala",
      ROOM_SEARCH_FAILED: "No se pudieron buscar las salas",
      ROOM_JOIN_FAILED: "No se pudo completar la unión",
      VOTE_SAVE_FAILED: "No se pudo guardar el voto",
      RESULTS_LOAD_FAILED: "No se pueden mostrar los resultados",
      INVALID_SESSION: "Sesión no válida",
      AUTH_REQUIRED_CREATE: "Debes iniciar sesión para crear una sala",
      INCOMPLETE_DATA: "Datos incompletos",
      ROOM_LIMITS_EXCEEDED: "Máximo 100 participantes",
      INVALID_QUEEN_PHOTO: "Una de las fotos de las reinas no es válida",
      ROOM_CREATE_FAILED: "No se pudo crear la partida",
      INVALID_INVITATION: "Esta invitación no es válida",
      ROOM_NOT_FOUND: "La sala no existe",
      ACCOUNT_ALREADY_VOTED: "Ya has votado en esta sala con tu cuenta",
      ACCOUNT_HAS_INVITATION:
         "Tu cuenta ya tiene otra invitación para esta sala",
      ACCOUNT_INVITATION_CONFLICT:
         "Tu cuenta ya está vinculada a otra invitación de esta sala",
      INVITATION_OTHER_ACCOUNT: "Esta invitación está vinculada a otra cuenta",
      INVALID_ADMIN_LINK: "Enlace de administración no válido",
      VOTING_NOT_OPEN: "La votación todavía no está abierta",
      VOTE_REQUIRED_TO_CLOSE:
         "Necesitas al menos un voto antes de cerrar la sala",
      PUBLISHED_ROOM_DELETE_FORBIDDEN:
         "Una sala cerrada y publicada no se puede eliminar",
      VOTING_CLOSED: "La votación ya está cerrada",
      PUBLIC_MEMBERS_USE_GLOBAL_LINK:
         "En una sala pública los miembros deben unirse mediante el enlace global",
      PARTICIPANT_LIMIT_REACHED:
         "La sala ha alcanzado el máximo de 100 participantes",
      PUBLIC_ROOM_NOT_FOUND: "Esta sala pública no existe",
      MEMBER_ACCOUNT_REQUIRED:
         "Debes iniciar sesión con la cuenta miembro de esta sala pública",
      ACCOUNT_ALREADY_PARTICIPATED: "Tu cuenta ya ha participado en esta sala",
      INVITATION_ALREADY_USED: "Esta invitación ya se ha utilizado",
      INVALID_RANKING: "La clasificación no es válida",
      INVALID_VOTE: "Voto no válido",
      INVALID_REQUEST: "Petición no válida",
      INVALID_LINK: "Enlace no válido",
      RESULTS_NOT_PUBLISHED:
         "La clasificación se publicará cuando la administradora cierre la sala",
   },
   en: {
      INVALID_NAME: "Enter a valid name",
      USERNAME_CHECK_FAILED: "The username could not be checked",
      DASHBOARD_LOAD_FAILED: "Rooms could not be loaded",
      ROOM_OPEN_FAILED: "The room could not be opened",
      PARTICIPANT_ADD_FAILED: "The participant could not be added",
      VOTING_OPEN_FAILED: "Voting could not be opened",
      VOTING_CLOSE_FAILED: "Voting could not be closed",
      ROOM_DELETE_FAILED: "The room could not be deleted",
      ROOM_SEARCH_FAILED: "Rooms could not be searched",
      ROOM_JOIN_FAILED: "You could not join the room",
      VOTE_SAVE_FAILED: "The vote could not be saved",
      RESULTS_LOAD_FAILED: "Results cannot be displayed",
      INVALID_SESSION: "Invalid session",
      AUTH_REQUIRED_CREATE: "You must sign in to create a room",
      INCOMPLETE_DATA: "Missing information",
      ROOM_LIMITS_EXCEEDED: "Maximum 100 participants",
      INVALID_QUEEN_PHOTO: "One of the queen photos is invalid",
      ROOM_CREATE_FAILED: "The room could not be created",
      INVALID_INVITATION: "This invitation is invalid",
      ROOM_NOT_FOUND: "The room does not exist",
      ACCOUNT_ALREADY_VOTED: "Your account has already voted in this room",
      ACCOUNT_HAS_INVITATION:
         "Your account already has another invitation for this room",
      ACCOUNT_INVITATION_CONFLICT:
         "Your account is already linked to another invitation in this room",
      INVITATION_OTHER_ACCOUNT: "This invitation is linked to another account",
      INVALID_ADMIN_LINK: "Invalid administration link",
      VOTING_NOT_OPEN: "Voting is not open yet",
      VOTE_REQUIRED_TO_CLOSE:
         "You need at least one vote before closing the room",
      PUBLISHED_ROOM_DELETE_FORBIDDEN:
         "A closed and published room cannot be deleted",
      VOTING_CLOSED: "Voting is already closed",
      PUBLIC_MEMBERS_USE_GLOBAL_LINK:
         "Public room members must join through the global link",
      PARTICIPANT_LIMIT_REACHED:
         "The room has reached the 100 participant limit",
      PUBLIC_ROOM_NOT_FOUND: "This public room does not exist",
      MEMBER_ACCOUNT_REQUIRED:
         "Sign in with the account that joined this public room",
      ACCOUNT_ALREADY_PARTICIPATED:
         "Your account has already participated in this room",
      INVITATION_ALREADY_USED: "This invitation has already been used",
      INVALID_RANKING: "The ranking is invalid",
      INVALID_VOTE: "Invalid vote",
      INVALID_REQUEST: "Invalid request",
      INVALID_LINK: "Invalid link",
      RESULTS_NOT_PUBLISHED:
         "The ranking will be published when the organizer closes the room",
   },
};

export function translateApiError(code: string, language: "es" | "en") {
   return messages[language][code as ApiErrorCode];
}
