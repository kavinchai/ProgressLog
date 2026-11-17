import AuthenticationServices
import Capacitor
import UIKit

/// Shows Apple's "Sign in with Apple" sheet and hands the result to the web
/// app (frontend/src/native/appleSignIn.js), which sends it to the backend.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        pendingCall = call
        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            finish { $0.reject("Apple didn't return a sign-in.", "failed") }
            return
        }
        let code = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        finish {
            $0.resolve([
                "identityToken": identityToken,
                "authorizationCode": code,
                // Apple only shares these the first time someone signs in.
                "givenName": credential.fullName?.givenName ?? "",
                "email": credential.email ?? "",
            ])
        }
    }

    public func authorizationController(
        controller: ASAuthorizationController, didCompleteWithError error: Error
    ) {
        let canceled = (error as? ASAuthorizationError)?.code == .canceled
        finish {
            $0.reject(
                canceled ? "Sign in with Apple was canceled." : error.localizedDescription,
                canceled ? "canceled" : "failed")
        }
    }

    private func finish(_ respond: (CAPPluginCall) -> Void) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        respond(call)
    }
}
