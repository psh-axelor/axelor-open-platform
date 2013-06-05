package com.axelor.web;

import javax.persistence.EntityTransaction;
import javax.persistence.PersistenceException;

import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;
import org.apache.shiro.authz.AuthorizationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.axelor.db.JPA;
import com.axelor.rpc.Response;

public class ResponseInterceptor implements MethodInterceptor {
	
	private final Logger log = LoggerFactory.getLogger(ResponseInterceptor.class);
	
	private final ThreadLocal<Boolean> running = new ThreadLocal<Boolean>();
	
	@Override
	public Object invoke(final MethodInvocation invocation) throws Throwable {
		
		if (running.get() == Boolean.TRUE) {
			return invocation.proceed();
		}

		log.debug("Web Service: {}", invocation.getMethod());
		
		Response response = null;
		
		running.set(true);
		try {
			response = (Response) invocation.proceed();
		} catch (Exception e) {
			EntityTransaction txn = JPA.em().getTransaction();
			if (txn.isActive()) {
				txn.rollback();
			} else if (e instanceof PersistenceException) {
				// recover the transaction
				try {
					txn.begin();
				} catch(Exception ex){}
			}
			response = new Response();
			if (e instanceof AuthorizationException) {
				if (!e.toString().contains("not authorized to read")) {
					response.setException(e);
				}
			} else {
				response.setException(e);
			}
			log.error("Error: {}", e, e);
		} finally {
			running.remove();
		}
		return response;
	}
}
