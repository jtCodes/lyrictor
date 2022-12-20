import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { GoogleLoginButton } from "react-social-login-buttons";
import { auth, googleProvider } from "../api/firebase";

// TODO: GoogleLoginButton not working after upgrade 
export default function LogInButton() {
  return (
    <>LoginButtonTODO</>
    // <GoogleLoginButton
    //   onClick={() => {
    //     signInWithPopup(auth, googleProvider)
    //       .then((result) => {
    //         // This gives you a Google Access Token. You can use it to access the Google API.
    //         const credential = GoogleAuthProvider.credentialFromResult(result);

    //         if (credential) {
    //           console.log(credential);
    //         }
    //         // ...
    //       })
    //       .catch((error) => {
    //         // Handle Errors here.
    //         const errorCode = error.code;
    //         const errorMessage = error.message;
    //         // The email of the user's account used.
    //         const email = error.email;
    //         // The AuthCredential type that was used.
    //         const credential = GoogleAuthProvider.credentialFromError(error);
    //         // ...
    //       });
    //   }}
    // />
  );
}
