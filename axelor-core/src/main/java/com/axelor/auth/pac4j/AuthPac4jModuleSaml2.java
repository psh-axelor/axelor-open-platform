/*
 * Axelor Business Solutions
 *
 * Copyright (C) 2005-2019 Axelor (<http://axelor.com>).
 *
 * This program is free software: you can redistribute it and/or  modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package com.axelor.auth.pac4j;

import com.axelor.app.AppSettings;
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletContext;
import org.opensaml.saml.common.xml.SAMLConstants;
import org.pac4j.saml.client.SAML2Client;
import org.pac4j.saml.config.SAML2Configuration;

public class AuthPac4jModuleSaml2 extends AuthPac4jModule {

  // Basic configuration
  protected static final String CONFIG_SAML2_KEYSTORE_PATH = "auth.saml2.keystore.path";
  protected static final String CONFIG_SAML2_KEYSTORE_PASSWORD = "auth.saml2.keystore.password";
  protected static final String CONFIG_SAML2_PRIVATE_KEY_PASSWORD =
      "auth.saml2.private.key.password";
  protected static final String CONFIG_SAML2_IDENTITY_PROVIDER_METADATA_PATH =
      "auth.saml2.identity.provider.metadata.path";

  // Additional configuration
  protected static final String CONFIG_SAML2_MAXIMUM_AUTHENTICATION_LIFETIME =
      "auth.saml2.maximum.authentication.lifetime";
  protected static final String CONFIG_SAML2_SERVICE_PROVIDER_ENTITY_ID =
      "auth.saml2.service.provider.entity.id";
  protected static final String CONFIG_SAML2_SERVICE_PROVIDER_METADATA_PATH =
      "auth.saml2.service.provider.metadata.path";

  // Advanced configuration
  protected static final String CONFIG_SAML2_FORCE_AUTH = "auth.saml2.force.auth";
  protected static final String CONFIG_SAML2_PASSIVE = "auth.saml2.passive";

  protected static final String CONFIG_SAML2_AUTHN_REQUEST_BINDING_TYPE =
      "auth.saml2.authn.request.binding.type";
  protected static final String CONFIG_SAML2_USE_NAME_QUALIFIER = "auth.saml2.use.name.qualifier";

  protected static final String CONFIG_SAML2_ATTRIBUTE_CONSUMING_SERVICE_INDEX =
      "auth.saml2.attribute.consuming.service.index";
  protected static final String CONFIG_SAML2_ASSERTION_CONSUMER_SERVICE_INDEX =
      "auth.saml2.assertion.consumer.service.index";

  protected static final String CONFIG_SAML2_BLACKLISTED_SIGNATURE_SIGNING_ALGORITHMS =
      "auth.saml2.blacklisted.signature.signing.algorithms";
  protected static final String CONFIG_SAML2_SIGNATURE_ALGORITHMS =
      "auth.saml2.signature.algorithms";
  protected static final String CONFIG_SAML2_SIGNATURE_REFERENCE_DIGEST_METHODS =
      "auth.saml2.signature.reference.digest.methods";
  protected static final String CONFIG_SAML2_SIGNATURE_CANONICALIZATION_ALGORITHM =
      "auth.saml2.signature.canonicalization.algorithm";

  protected static final String CONFIG_SAML2_WANTS_ASSERTIONS_SIGNED =
      "auth.saml2.wants.assertions.signed";
  protected static final String CONFIG_SAML2_AUTHN_REQUEST_SIGNED =
      "auth.saml2.authn.request.signed";

  private static final Map<String, String> authnRequestBindingTypes =
      ImmutableMap.of(
          "SAML2_POST_BINDING_URI",
          SAMLConstants.SAML2_POST_BINDING_URI,
          "SAML2_POST_SIMPLE_SIGN_BINDING_URI",
          SAMLConstants.SAML2_POST_SIMPLE_SIGN_BINDING_URI,
          "SAML2_REDIRECT_BINDING_URI",
          SAMLConstants.SAML2_REDIRECT_BINDING_URI);

  public AuthPac4jModuleSaml2(ServletContext servletContext) {
    super(servletContext);
  }

  @Override
  protected void configureClients() {
    final AppSettings settings = AppSettings.get();

    final String keystorePath = settings.get(CONFIG_SAML2_KEYSTORE_PATH);
    final String keystorePassword = settings.get(CONFIG_SAML2_KEYSTORE_PASSWORD);
    final String privateKeyPassword = settings.get(CONFIG_SAML2_PRIVATE_KEY_PASSWORD);
    final String identityProviderMetadataPath =
        settings.get(CONFIG_SAML2_IDENTITY_PROVIDER_METADATA_PATH);

    final int maximumAuthenticationLifetime =
        settings.getInt(CONFIG_SAML2_MAXIMUM_AUTHENTICATION_LIFETIME, -1);
    final String serviceProviderEntityId =
        settings.get(CONFIG_SAML2_SERVICE_PROVIDER_ENTITY_ID, null);
    final String serviceProviderMetadataPath =
        settings.get(CONFIG_SAML2_SERVICE_PROVIDER_METADATA_PATH, null);

    final boolean forceAuth = settings.getBoolean(CONFIG_SAML2_FORCE_AUTH, false);
    final boolean passive = settings.getBoolean(CONFIG_SAML2_PASSIVE, false);

    final String authnRequestBindingType =
        settings.get(CONFIG_SAML2_AUTHN_REQUEST_BINDING_TYPE, null);
    final boolean useNameQualifier = settings.getBoolean(CONFIG_SAML2_USE_NAME_QUALIFIER, false);

    final int attributeConsumingServiceIndex =
        settings.getInt(CONFIG_SAML2_ATTRIBUTE_CONSUMING_SERVICE_INDEX, -1);
    final int assertionConsumerServiceIndex =
        settings.getInt(CONFIG_SAML2_ASSERTION_CONSUMER_SERVICE_INDEX, -1);

    final List<String> blackListedSignatureSigningAlgorithms =
        settings.getList(CONFIG_SAML2_BLACKLISTED_SIGNATURE_SIGNING_ALGORITHMS);
    final List<String> signatureAlgorithms = settings.getList(CONFIG_SAML2_SIGNATURE_ALGORITHMS);
    final List<String> signatureReferenceDigestMethods =
        settings.getList(CONFIG_SAML2_SIGNATURE_REFERENCE_DIGEST_METHODS);
    final String signatureCanonicalizationAlgorithm =
        settings.get(CONFIG_SAML2_SIGNATURE_CANONICALIZATION_ALGORITHM, null);

    final boolean wantsAssertionsSigned =
        settings.getBoolean(CONFIG_SAML2_WANTS_ASSERTIONS_SIGNED, false);
    final boolean authnRequestSigned =
        settings.getBoolean(CONFIG_SAML2_AUTHN_REQUEST_SIGNED, false);

    final SAML2Configuration saml2Config =
        new SAML2Configuration(
            keystorePath, keystorePassword, privateKeyPassword, identityProviderMetadataPath);

    if (maximumAuthenticationLifetime >= 0) {
      saml2Config.setMaximumAuthenticationLifetime(maximumAuthenticationLifetime);
    }

    if (serviceProviderEntityId != null) {
      saml2Config.setServiceProviderEntityId(serviceProviderEntityId);
    }
    if (serviceProviderMetadataPath != null) {
      saml2Config.setServiceProviderMetadataPath(serviceProviderMetadataPath);
    }

    saml2Config.setForceAuth(forceAuth);
    saml2Config.setPassive(passive);

    if (authnRequestBindingType != null) {
      saml2Config.setAuthnRequestBindingType(
          authnRequestBindingTypes.getOrDefault(authnRequestBindingType, authnRequestBindingType));
    }

    saml2Config.setUseNameQualifier(useNameQualifier);

    if (attributeConsumingServiceIndex >= 0) {
      saml2Config.setAttributeConsumingServiceIndex(attributeConsumingServiceIndex);
    }
    if (assertionConsumerServiceIndex >= 0) {
      saml2Config.setAssertionConsumerServiceIndex(assertionConsumerServiceIndex);
    }

    if (!blackListedSignatureSigningAlgorithms.isEmpty()) {
      saml2Config.setBlackListedSignatureSigningAlgorithms(blackListedSignatureSigningAlgorithms);
    }
    if (!signatureAlgorithms.isEmpty()) {
      saml2Config.setSignatureAlgorithms(signatureAlgorithms);
    }
    if (!signatureReferenceDigestMethods.isEmpty()) {
      saml2Config.setSignatureReferenceDigestMethods(signatureReferenceDigestMethods);
    }
    if (signatureCanonicalizationAlgorithm != null) {
      saml2Config.setSignatureCanonicalizationAlgorithm(signatureCanonicalizationAlgorithm);
    }

    saml2Config.setWantsAssertionsSigned(wantsAssertionsSigned);
    saml2Config.setAuthnRequestSigned(authnRequestSigned);

    SAML2Client client = new SAML2Client(saml2Config);
    addClient(client);
  }

  public static boolean isEnabled() {
    final AppSettings settings = AppSettings.get();
    return settings.get(CONFIG_SAML2_KEYSTORE_PATH, null) != null;
  }
}
